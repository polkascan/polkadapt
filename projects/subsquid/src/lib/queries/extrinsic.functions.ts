import { Adapter, Fields, Where } from '../subsquid';
import { catchError, combineLatest, filter, map, Observable, of, switchMap, take, tap, throwError, timer } from 'rxjs';
import { types } from '@polkadapt/core';
import { isDate, isDefined, isObject, isPositiveNumber, isString } from './helpers';
import * as st from '../subsquid.types';
import { getLatestBlock } from './block.functions';


export type ArchiveExtrinsicInput = {
  id: string;
  indexInBlock: number;
  tip: string;
  fee: string | null;
  error: string | null;
  hash: string;
  version: number;
  signature: string | null;
  success: boolean;
  block: {
    height: number;
    hash: string;
    timestamp: string;
    spec: {
      specName: string;
      specVersion: number;
    };
  };
  call: {
    id: string;
    name: string;
    args: string;
  };
};

const archiveFields: Fields = [
  'id',
  'hash',
  'indexInBlock',
  'version',
  'signature',
  'tip',
  'fee',
  'error',
  'success',
  {
    block: [
      'height',
      'hash',
      'timestamp',
      {
        spec: [
          'specVersion',
          'specName',
        ]
      },

    ]
  },
  {
    call: [
      'id',
      'name',
      'args'
    ]
  }
];

export type GSExplorerExtrinsicInput = {
  id: string;
  blockNumber: number;
  indexInBlock: number;
  timestamp: string;
  tip: string | null;  // number as string
  version: number;
  success: boolean;
  error: string | null;
  extrinsicHash: string;
  fee: string | null;  // number as string
  signerPublicKey: string | null;
  block: {
    specVersion: number;
    hash: string;
  };
  mainCall: {
    argsStr: string | null;
    callName: string;
    palletName: string;
    callerPublicKey: string | null;
  };
};

const gsExplorerFields: Fields = [
  'id',
  'blockNumber',
  'indexInBlock',
  'timestamp',
  'tip',
  'version',
  'success',
  'error',
  'extrinsicHash',
  'fee',
  'signerPublicKey',
  {
    block: [
      'specVersion',
      'hash'
    ]
  },
  {
    mainCall: [
      'argsStr',
      'callName',
      'palletName',
      'success'
    ]
  }
];

export type ArchiveExtrinsicArgsInput = {
  id: string;
  signature: string | null;
  block: {
    spec: {
      specName: string;
      specVersion: number;
    };
  };
  call: {
    id: string;
    name: string;
    args: string;
  };
};

const archiveExtrinsicArgsFields: Fields = [
  'id',
  'signature',
  {
    block: [
      {
        spec: ['specName', 'specVersion']
      }
    ]
  },
  {
    call: [
      'id',
      'name',
      'args'
    ]
  }
];

export interface ExtrinsicsFilters {
  blockNumber?: number;
  callModule?: string;
  callName?: string;
  signed?: number;
  multiAddressAccountId?: string;
  specName?: string;
  specVersion?: number;
  dateRangeBegin?: Date;
  dateRangeEnd?: Date;
  blockRangeBegin?: number;
  blockRangeEnd?: number;
}

const identifiers = ['blockNumber', 'extrinsicIdx'];

export const getExtrinsicsBase = (
  adapter: Adapter,
  pageSize?: number,
  blockNumber?: number,
  extrinsicIdx?: number,
  callModule?: string,
  callName?: string,
  signed?: number,
  multiAddressAccountId?: string,
  specName?: string,
  specVersion?: number,
  dateRangeBegin?: Date,
  dateRangeEnd?: Date,
  blockRangeBegin?: number,
  blockRangeEnd?: number
): Observable<types.Extrinsic[]> => {

  const gsWhere: Where = {};
  const archiveWhere: Where = {};

  if (isDefined(blockNumber)) {
    if (isPositiveNumber(blockNumber)) {
      archiveWhere['block'] = gsWhere['block'] ? gsWhere['block'] as Where : {};
      archiveWhere['block']['height_eq'] = blockNumber;
      gsWhere['blockNumber_eq'] = blockNumber;
    } else {
      return throwError(() => 'Provided block number must be a positive number.');
    }
  }

  if (isDefined(extrinsicIdx)) {
    if (isPositiveNumber(extrinsicIdx)) {
      archiveWhere['indexInBlock_eq'] = extrinsicIdx;
      gsWhere['indexInBlock_eq'] = extrinsicIdx;
    } else {
      return throwError(() => 'Provided extrinsicIdx must be a positive number.');
    }
  }

  if (isDefined(callModule)) {
    if (isString(callModule)) {
      // archiveWhere['call']['name_startsWith'] = callModule;
      gsWhere['mainCall'] = gsWhere['mainCall'] ? gsWhere['mainCall'] as Where : {};
      gsWhere['mainCall']['palletName_eq'] = callModule;
    } else {
      return throwError(() => 'Provided call module (pallet) must be a non-empty string.');
    }
  }

  if (isDefined(callName)) {
    if (isString(callName)) {
      if (isDefined(callModule)) {
        // archiveWhere['call']['name_endsWith'] = callName;
        gsWhere['mainCall'] = gsWhere['mainCall'] ? gsWhere['mainCall'] as Where : {};
        gsWhere['mainCall']['callName_eq'] = callName;
      } else {
        return throwError(() => 'Missing call module (string), only call name is provided.');
      }
    } else {
      return throwError(() => 'Provided call name must be a non-empty string.');
    }
  }

  if (isDefined(signed)) {
    if (Number.isInteger(signed) && (signed === 0 || signed === 1)) {
      archiveWhere['signature_isNull'] = signed !== 1;
      gsWhere['signerPublicKey_isNull'] = signed !== 1;
    } else {
      throw new Error('Provided signed must be an number with value 0 or 1.');
    }
  }

  if (isDefined(multiAddressAccountId)) {
    if (isString(multiAddressAccountId)) {
      gsWhere['mainCall'] = gsWhere['mainCall'] ? gsWhere['mainCall'] as Where : {};
      gsWhere['mainCall']['callerPublicKey_eq'] = multiAddressAccountId;
    } else {
      throw new Error('Provided call module must be a non-empty string.');
    }
  }

  if (isDefined(specName)) {
    if (isString(specName)) {
      archiveWhere['block'] = archiveWhere['block'] ? archiveWhere['block'] as Where : {};
      archiveWhere['block']['spec'] = archiveWhere['block']['spec'] ? archiveWhere['block']['spec'] as Where : {};
      archiveWhere['block']['spec']['specName_eq'] = specName;
    } else {
      return throwError(() => 'Provided spec name must be a non-empty string.');
    }
  }

  if (isDefined(specVersion)) {
    if (isPositiveNumber(specVersion)) {
      archiveWhere['block'] = archiveWhere['block'] ? archiveWhere['block'] as Where : {};
      archiveWhere['block']['spec'] = archiveWhere['block']['spec'] ? archiveWhere['block']['spec'] as Where : {};
      archiveWhere['block']['spec']['specVersion_eq'] = specVersion;
      gsWhere['block'] = gsWhere['block'] ? gsWhere['block'] as Where : {};
      gsWhere['block']['specVersion_eq'] = specVersion;
    } else {
      return throwError(() => 'Provided spec version must be a number.');
    }
  }

  if (isDefined(dateRangeBegin) && isDefined(dateRangeEnd)) {
    if (isDate(dateRangeBegin) && isDate(dateRangeEnd)) {
      if (dateRangeBegin > dateRangeEnd) {
        return throwError(() => 'Provided date range is invalid.');
      }
      const timestampBegin = dateRangeBegin.toJSON();
      const timestampEnd = dateRangeEnd.toJSON();
      archiveWhere['block'] = archiveWhere['block'] ? archiveWhere['block'] as Where : {};
      archiveWhere['block']['timestamp_gte'] = timestampBegin;
      archiveWhere['block']['timestamp_lte'] = timestampEnd;
      gsWhere['timestamp_gte'] = timestampBegin;
      gsWhere['timestamp_lte'] = timestampEnd;
    } else {
      return throwError(() => 'Provided begin and end date must be a Date.');
    }
  } else if (isDefined(dateRangeBegin)) {
    if (isDate(dateRangeBegin)) {
      const timestampBegin = dateRangeBegin.toJSON();
      archiveWhere['block'] = archiveWhere['block'] ? archiveWhere['block'] as Where : {};
      archiveWhere['block']['timestamp_gte'] = timestampBegin;
      gsWhere['timestamp_gte'] = timestampBegin;
    } else {
      return throwError(() => 'Provided begin date must be a Date.');
    }
  } else if (isDefined(dateRangeEnd)) {
    if (isDate(dateRangeEnd)) {
      const timestampEnd = dateRangeEnd.toJSON();
      archiveWhere['block'] = archiveWhere['block'] ? archiveWhere['block'] as Where : {};
      gsWhere['timestamp_lte'] = timestampEnd;
    } else {
      return throwError(() => 'Provided end date must be a Date.');
    }
  }

  if (isDefined(blockRangeBegin) && isDefined(blockRangeEnd)) {
    if (isPositiveNumber(blockRangeBegin) && isPositiveNumber(blockRangeEnd)) {
      if (blockRangeEnd < blockRangeBegin) {
        return throwError(() => 'Provided block number range is invalid.');
      }
      archiveWhere['block'] = archiveWhere['block'] ? archiveWhere['block'] as Where : {};
      archiveWhere['block']['height_gte'] = blockRangeBegin;
      archiveWhere['block']['height_lte'] = blockRangeEnd;
      gsWhere['blockNumber_gte'] = blockRangeBegin;
      gsWhere['blockNumber_lte'] = blockRangeEnd;
    } else {
      return throwError(() => 'Provided block range begin and end must be positive numbers.');
    }
  } else if (isDefined(blockRangeBegin)) {
    if (isPositiveNumber(blockRangeBegin)) {
      archiveWhere['block'] = archiveWhere['block'] ? archiveWhere['block'] as Where : {};
      archiveWhere['block']['height_gte'] = blockRangeBegin;
      gsWhere['blockNumber_gte'] = blockRangeBegin;
    } else {
      return throwError(() => 'Provided begin block must be a positive number.');
    }
  } else if (isDefined(blockRangeEnd)) {
    if (isPositiveNumber(blockRangeEnd)) {
      archiveWhere['block'] = archiveWhere['block'] ? archiveWhere['block'] as Where : {};
      archiveWhere['block']['height_lte'] = blockRangeEnd;
      gsWhere['blockNumber_lte'] = blockRangeEnd;
    } else {
      return throwError(() => 'Provided end block must be a positive number.');
    }
  }

  const contentType = 'extrinsics';
  const orderBy = 'id_DESC';

  return adapter.queryGSExplorer<GSExplorerExtrinsicInput[]>(
    contentType,
    gsExplorerFields,
    gsWhere,
    orderBy,
    pageSize
  ).pipe(
    catchError(() =>
      adapter.queryArchive<ArchiveExtrinsicInput[]>(
        contentType,
        archiveFields,
        archiveWhere,
        orderBy,
        pageSize
      )),
    switchMap(
      (rawExtrinsics) => {
        if (!rawExtrinsics) {
          return throwError(() => new Error('Fetching extrinsics from subsquid failed.'));
        }

        if (rawExtrinsics && rawExtrinsics.length === 0) {
          return of([]);
        }

        const extrinsic = rawExtrinsics[0];

        if (Object.keys(extrinsic).indexOf('call') === -1) {
          // No call attribute in extrinsic, we are dealing with an extrinsic coming from the GS Explorer.
          // Get call from archive.
          return combineLatest([
            of(rawExtrinsics as GSExplorerExtrinsicInput[]),
            adapter.queryArchive<ArchiveExtrinsicArgsInput[]>(
              contentType,
              archiveExtrinsicArgsFields,
              // eslint-disable-next-line @typescript-eslint/naming-convention
              {id_in: rawExtrinsics.map((v) => v.id)},
              orderBy,
              pageSize
            )
          ]).pipe(
            map(([extrinsics, extrinsicsArgs]) =>
              extrinsics.map((ev) => {
                const evArgs = extrinsicsArgs.find((a) => ev.id === a.id);
                const modifiedExtrinsic = Object.assign(ev) as GSExplorerExtrinsicInput & ArchiveExtrinsicArgsInput;
                if (evArgs) {
                  modifiedExtrinsic.signature = evArgs.signature;
                  modifiedExtrinsic.call = evArgs.call;
                  modifiedExtrinsic.block.spec = {
                    specName: evArgs.block.spec.specName,
                    specVersion: evArgs.block.spec.specVersion
                  };
                }
                return modifiedExtrinsic;
              })
            ),
            catchError((e) => {
              console.error(e);
              return of(rawExtrinsics as GSExplorerExtrinsicInput[]);
            })
          );
        } else {
          return of(rawExtrinsics as ArchiveExtrinsicInput[]);
        }
      }
    ),
    map((extrinsics) =>
      extrinsics.map<st.Extrinsic>((extrinsic) => {
        let isSigned = 0;
        let signatureValue: string | null = null;
        if ((extrinsic as GSExplorerExtrinsicInput).signerPublicKey) {
          isSigned = 1;
        }
        if ((extrinsic as ArchiveExtrinsicInput).signature) {
          isSigned = 1;
          signatureValue = ((extrinsic as ArchiveExtrinsicInput).signature as unknown as {signature: {value: string}}).signature?.value;
        }

        let callerAccountId: string | null = null;
        if ((extrinsic as GSExplorerExtrinsicInput).mainCall.callerPublicKey) {
          callerAccountId = (extrinsic as GSExplorerExtrinsicInput).mainCall.callerPublicKey;
        } else if ((extrinsic as ArchiveExtrinsicInput).signature) {
          callerAccountId = ((extrinsic as ArchiveExtrinsicInput).signature as unknown as {address: {value: string}}).address?.value;
        }

        return {
          blockNumber: (extrinsic as GSExplorerExtrinsicInput).blockNumber || (extrinsic as ArchiveExtrinsicInput).block?.height,
          extrinsicIdx: extrinsic.indexInBlock,
          hash: (extrinsic as GSExplorerExtrinsicInput).extrinsicHash || (extrinsic as ArchiveExtrinsicInput).hash,
          version: extrinsic.version,
          callModule: (extrinsic as GSExplorerExtrinsicInput).mainCall.palletName,
          callName: (extrinsic as GSExplorerExtrinsicInput).mainCall.callName,
          callArguments: (extrinsic as ArchiveExtrinsicInput).call?.args || (extrinsic as GSExplorerExtrinsicInput).mainCall.argsStr,
          signed: isSigned,
          multiAddressAccountId: callerAccountId,
          signature: signatureValue,
          feeTotal: extrinsic.fee ? parseInt(extrinsic.fee, 10) : null,
          tip: extrinsic.tip ? parseInt(extrinsic.tip, 10) : null,
          error: extrinsic.error,
          blockDatetime: (extrinsic as GSExplorerExtrinsicInput).timestamp || (extrinsic as ArchiveExtrinsicInput).block?.timestamp,
          blockHash: extrinsic.block?.hash,
          specName: (extrinsic as ArchiveExtrinsicInput).block?.spec?.specName,
          specVersion: (extrinsic as GSExplorerExtrinsicInput).block?.specVersion
            || (extrinsic as ArchiveExtrinsicInput).block?.spec?.specVersion
        };
      })
    )
  );
};


export const getExtrinsic = (adapter: Adapter) => {
  const fn = (blockNumber: number, extrinsicIdx: number) =>
    getExtrinsicsBase(adapter, 1, blockNumber, extrinsicIdx).pipe(
      catchError((e: string) => throwError(() => new Error(`[SubsquidAdapter] getExtrinsic: ${e}`))),
      map(extrinsics => extrinsics[0])
    );
  fn.identifiers = identifiers;
  return fn;
};


export const getExtrinsics = (adapter: Adapter) => {
  const fn = (filters?: ExtrinsicsFilters, pageSize?: number) => {
    filters = filters || {};
    return getExtrinsicsBase(
      adapter,
      pageSize,
      filters.blockNumber,
      undefined,
      filters.callModule,
      filters.callName,
      filters.signed,
      filters.multiAddressAccountId,
      filters.specName,
      filters.specVersion,
      filters.dateRangeBegin,
      filters.dateRangeEnd,
      filters.blockRangeBegin,
      filters.blockRangeEnd
    ).pipe(
      catchError((e: string) => throwError(() => new Error(`[SubsquidAdapter] getExtrinsics: ${e}`)))
    );
  };
  fn.identifiers = identifiers;
  return fn;
};


export const subscribeNewExtrinsicBase = (adapter: Adapter) =>
  (_filters?: ExtrinsicsFilters) => {
    const filters = isObject(_filters) ? _filters : {};
    let height: number;
    let timestamp: string;

    return getLatestBlock(adapter)().pipe(
      take(1),
      switchMap((block) => {
        if (isPositiveNumber(block.number)) {
          height = block.number;
        } else {
          return throwError(() => new Error('No block height found to start from'));
        }

        if (isString(block.datetime)) {
          timestamp = block.datetime;
        }

        if (isString(filters.dateRangeEnd)) {
          if ((new Date(timestamp)) > (new Date(filters.dateRangeEnd))) {
            return throwError(() => new Error('Latest block number is beyond the date range.'));
          }
        }

        return timer(0, 6000).pipe(
          switchMap(() => {
            if (isPositiveNumber(height)) {
              if (isPositiveNumber(filters.blockRangeBegin) && filters.blockRangeBegin < height) {
                // The latest block number is below the filtered range, return empty until height is matched.
                return of([]);
              }
              if (isPositiveNumber(filters.blockRangeEnd) && height > filters.blockRangeEnd) {
                // The latest block number exceeds the filtered range, stop.
                return throwError(() => new Error('Latest block number is beyond the filtered range.'));
              }
            }

            if (timestamp) {
              if (isString(filters.dateRangeBegin)) {
                if ((new Date(filters.dateRangeBegin)) < (new Date(timestamp))) {
                  // The latest block timestamp is below the filtered range, wait until the datetime matches.
                  return of([]);
                }
              }
            }

            return getExtrinsicsBase(
              adapter,
              100,
              filters.blockNumber,
              undefined,
              filters.callModule,
              filters.callName,
              filters.signed,
              filters.multiAddressAccountId,
              filters.specName,
              filters.specVersion,
              filters.dateRangeBegin,
              filters.dateRangeEnd,
              height,
              filters.blockRangeEnd
            ).pipe(
              tap((extrinsics) => {
                if (extrinsics.length > 0) {
                  // Check the last height that came from the response and reset the height to the next block number.
                  // The next cycle will start with the next block number.
                  height = extrinsics[0].blockNumber + 1;
                  timestamp = extrinsics[0].blockDatetime as string;
                }
              }),
              filter((extrinsics) => extrinsics.length > 0),
              switchMap((extrinsics) => of(...extrinsics.reverse()))
            );

            // On the next cycle try the next block with matching extrinsics;
            height += 1;
          })
        );
      }),
      catchError((e) => {
        console.error('[SubsquidAdapter] subscribeNewExtrinsic', e);
        return of(undefined);
      }),
      filter((e): e is types.Extrinsic => isObject(e))
    );
  };


export const subscribeNewExtrinsic = (adapter: Adapter) => {
  const fn = (filters?: ExtrinsicsFilters) => subscribeNewExtrinsicBase(adapter)(filters);
  fn.identifiers = identifiers;
  return fn;
};
