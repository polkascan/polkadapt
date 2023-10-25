/*
 * PolkADAPT
 *
 * Copyright 2020-2023 Polkascan Foundation (NL)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Adapter, Fields, Where } from '../subsquid';
import { catchError, filter, map, Observable, of, switchMap, take, tap, throwError, timer } from 'rxjs';
import { types } from '@polkadapt/core';
import { isDate, isDefined, isHash, isObject, isPositiveNumber, isString } from './helpers';
import * as st from '../subsquid.types';
import { getLatestBlock } from './block.functions';


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
    height: number
    hash: string;
    specVersion: number;
    timestamp: string;
  };
  mainCall: {
    id: string;
    // argsStr: { [k: string]: any };
    callName: string;
    palletName: string;
    success: boolean;
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
      'height',
      'hash',
      'specVersion',
      'timestamp'
    ]
  },
  {
    mainCall: [
      'id',
      // 'argsStr',
      'callName',
      'palletName',
      'success',
      'callerPublicKey'
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
  blockNumberOrHash?: number | string,
  extrinsicIdx?: number | null,
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
  let orderBy: string | undefined = 'id_DESC';

  if (isDefined(blockNumberOrHash)) {
    if (isPositiveNumber(blockNumberOrHash)) {
      if (isPositiveNumber(extrinsicIdx)) {
        orderBy = undefined;
      }
      gsWhere['blockNumber_eq'] = blockNumberOrHash;
    } else if (isHash(blockNumberOrHash)) {
      gsWhere['extrinsicHash_eq'] = blockNumberOrHash;
      orderBy = undefined;
    } else {
      return throwError(() => 'Provided block number or hash must be a positive number or a hash string.');
    }
  }

  if (isDefined(extrinsicIdx)) {
    if (isPositiveNumber(extrinsicIdx) && !isHash(blockNumberOrHash)) {
      gsWhere['indexInBlock_eq'] = extrinsicIdx;
    } else {
      return throwError(() => 'Provided extrinsicIdx must be a positive number.');
    }
  }

  if (isDefined(callModule)) {
    if (isString(callModule)) {
      gsWhere['mainCall'] = gsWhere['mainCall'] ? gsWhere['mainCall'] as Where : {};
      gsWhere['mainCall']['palletName_eq'] = callModule;
    } else {
      return throwError(() => 'Provided call module (pallet) must be a non-empty string.');
    }
  }

  if (isDefined(callName)) {
    if (isString(callName)) {
      if (isDefined(callModule)) {
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
      // Giant squid has not implemented specName. Ignore it for now.
    } else {
      return throwError(() => 'Provided spec name must be a non-empty string.');
    }
  }

  if (isDefined(specVersion)) {
    if (isPositiveNumber(specVersion)) {
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
      gsWhere['timestamp_gte'] = timestampBegin;
      gsWhere['timestamp_lte'] = timestampEnd;
    } else {
      return throwError(() => 'Provided begin and end date must be a Date.');
    }
  } else if (isDefined(dateRangeBegin)) {
    if (isDate(dateRangeBegin)) {
      const timestampBegin = dateRangeBegin.toJSON();
      gsWhere['timestamp_gte'] = timestampBegin;
    } else {
      return throwError(() => 'Provided begin date must be a Date.');
    }
  } else if (isDefined(dateRangeEnd)) {
    if (isDate(dateRangeEnd)) {
      const timestampEnd = dateRangeEnd.toJSON();
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
      gsWhere['blockNumber_gte'] = blockRangeBegin;
      gsWhere['blockNumber_lte'] = blockRangeEnd;
    } else {
      return throwError(() => 'Provided block range begin and end must be positive numbers.');
    }
  } else if (isDefined(blockRangeBegin)) {
    if (isPositiveNumber(blockRangeBegin)) {
      gsWhere['blockNumber_gte'] = blockRangeBegin;
    } else {
      return throwError(() => 'Provided begin block must be a positive number.');
    }
  } else if (isDefined(blockRangeEnd)) {
    if (isPositiveNumber(blockRangeEnd)) {
      gsWhere['blockNumber_lte'] = blockRangeEnd;
    } else {
      return throwError(() => 'Provided end block must be a positive number.');
    }
  }

  const contentType = 'extrinsics';

  return adapter.queryGSExplorer<GSExplorerExtrinsicInput[]>(
    contentType,
    gsExplorerFields,
    gsWhere,
    orderBy,
    pageSize
  ).pipe(
    switchMap(
      (rawExtrinsics) => {
        if (!rawExtrinsics) {
          return throwError(() => new Error('Fetching extrinsics from subsquid failed.'));
        }

        if (rawExtrinsics && rawExtrinsics.length === 0) {
          return of([]);
        }

        return of(rawExtrinsics);
      }
    ),
    map((extrinsics) =>
      extrinsics.map<st.Extrinsic>((extrinsic) => {
        let isSigned = 0;
        if (extrinsic.signerPublicKey) {
          isSigned = 1;
        }

        const callerAccountId = extrinsic.signerPublicKey || null;
        const callName = extrinsic.mainCall?.callName || null;
        const callModule = extrinsic.mainCall?.palletName || null;
        // const callArguments = extrinsic.mainCall?.argsStr || null;

        return {
          blockNumber: extrinsic.blockNumber || extrinsic.block?.height,
          extrinsicIdx: extrinsic.indexInBlock,
          hash: extrinsic.extrinsicHash,
          version: extrinsic.version,
          callModule: callModule,
          callName: callName,
          // callArguments: callArguments,
          signed: isSigned,
          multiAddressAccountId: callerAccountId,
          signature: extrinsic.signerPublicKey,
          feeTotal: extrinsic.fee ? parseInt(extrinsic.fee, 10) : null,
          tip: extrinsic.tip ? parseInt(extrinsic.tip, 10) : null,
          error: extrinsic.error,
          blockDatetime: extrinsic.timestamp || extrinsic.block?.timestamp,
          blockHash: extrinsic.block?.hash,
          specVersion: extrinsic.block?.specVersion
        };
      })
    )
  );
};


export const getExtrinsic = (adapter: Adapter) => {
  const fn = (blockNumberOrHash: number | string, extrinsicIdx?: number) =>
    getExtrinsicsBase(adapter, 1, blockNumberOrHash, extrinsicIdx).pipe(
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
