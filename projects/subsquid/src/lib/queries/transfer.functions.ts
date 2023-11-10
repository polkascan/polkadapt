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
import * as st from '../subsquid.types';
import { types } from '@polkadapt/core';
import { isDate, isDefined, isObject, isPositiveNumber, isString, isBoolean } from './helpers';
import { getLatestBlock } from './block.functions';


export type GSExplorerTransferInput = {
  id: string;
  direction: string;
  transfer: {
    id: string;
    amount: string;
    blockNumber: number;
    success: boolean;
    timestamp: string;
    extrinsicHash: string;
    from: {
      publicKey: string;
    };
    to: {
      publicKey: string;
    }
  };
  account: {
    publicKey: string;
  }
};


const gsExplorerTransferFields: Fields = [
  'id',
  'direction',
  {
    'transfer': [
      'id',
      'amount',
      'blockNumber',
      'success',
      'timestamp',
      'extrinsicHash',
      {
        from: [
          'publicKey'
        ]
      },
      {
        to: [
          'publicKey'
        ]
      }
    ]
  },
  {
    'account': [
      'publicKey'
    ]
  }
];

export interface TransfersFilters {
  blockNumber?: number;
  extrinsicHash?: string;
  success?: boolean;
  accountIdHex?: string;
  direction?: 'from' | 'to';
  dateRangeBegin?: Date;
  dateRangeEnd?: Date;
  blockRangeBegin?: number;
  blockRangeEnd?: number;
}

const identifiers = ['blockNumber', 'eventIdx'];


export const getTransfersBase = (
  adapter: Adapter,
  pageSize?: number,
  blockNumber?: string | number,
  extrinsicHash?: string,
  success?: boolean,
  dateRangeBegin?: Date,
  dateRangeEnd?: Date,
  blockRangeBegin?: number,
  blockRangeEnd?: number,
  accountIdHex?: string,
  direction?: 'from' | 'to'
): Observable<types.Transfer[]> => {

  const gsWhere: Where = {};

  if (isDefined(blockNumber)) {
    if (isPositiveNumber(blockNumber)) {
      gsWhere['transfer'] = gsWhere['transfer'] as Where || {};
      gsWhere['transfer']['blockNumber_eq'] = blockNumber;
    } else {
      return throwError(() => 'Provided block number must be a positive number.');
    }
  }

  if (isDefined(extrinsicHash)) {
    if (isString(extrinsicHash)) {
      gsWhere['transfer'] = gsWhere['transfer'] as Where || {};
      gsWhere['transfer']['extrinsicHash_eq'] = extrinsicHash;
    } else {
      return throwError(() => 'Provided extrinsicHash must be a string.');
    }
  }

  if (isDefined(success)) {
    if (isBoolean(success)) {
      gsWhere['transfer'] = gsWhere['transfer'] as Where || {};
      gsWhere['transfer']['succes_eq'] = success
    } else {
      return throwError(() => 'Provided variable success must be a boolean.');
    }
  }

  if (isDefined(dateRangeBegin) && isDefined(dateRangeEnd)) {
    if (isDate(dateRangeBegin) && isDate(dateRangeEnd)) {
      if (dateRangeBegin > dateRangeEnd) {
        return throwError(() => 'Provided date range is invalid.');
      }
      const timestampBegin = dateRangeBegin.toJSON();
      const timestampEnd = dateRangeEnd.toJSON();
      gsWhere['transfer'] = gsWhere['transfer'] as Where || {};
      gsWhere['transfer']['timestamp_gte'] = timestampBegin;
      gsWhere['transfer']['timestamp_lte'] = timestampEnd;
    } else {
      return throwError(() => 'Provided begin and end date must be a Date.');
    }
  } else if (isDefined(dateRangeBegin)) {
    if (isDate(dateRangeBegin)) {
      const timestampBegin = dateRangeBegin.toJSON();
      gsWhere['transfer'] = gsWhere['transfer'] as Where || {};
      gsWhere['transfer']['timestamp_gte'] = timestampBegin;
    } else {
      return throwError(() => 'Provided begin date must be a Date.');
    }
  } else if (isDefined(dateRangeEnd)) {
    if (isDate(dateRangeEnd)) {
      const timestampEnd = dateRangeEnd.toJSON();
      gsWhere['transfer'] = gsWhere['transfer'] as Where || {};
      gsWhere['transfer']['timestamp_lte'] = timestampEnd;
    } else {
      return throwError(() => 'Provided end date must be a Date.');
    }
  }

  if (isDefined(blockRangeBegin) && isDefined(blockRangeEnd)) {
    if (isPositiveNumber(blockRangeBegin) && isPositiveNumber(blockRangeEnd)) {
      if (blockRangeEnd < blockRangeBegin) {
        return throwError(() => 'Provided block number range is invalid.');
      }
      gsWhere['transfer'] = gsWhere['transfer'] as Where || {};
      gsWhere['transfer']['blockNumber_gte'] = blockRangeBegin;
      gsWhere['transfer']['blockNumber_lte'] = blockRangeEnd;
    } else {
      return throwError(() => 'Provided block range begin and end must be positive numbers.');
    }
  } else if (isDefined(blockRangeBegin)) {
    if (isPositiveNumber(blockRangeBegin)) {
      gsWhere['transfer'] = gsWhere['transfer'] as Where || {};
      gsWhere['transfer']['blockNumber_gte'] = blockRangeBegin;
    } else {
      return throwError(() => 'Provided begin block must be a positive number.');
    }
  } else if (isDefined(blockRangeEnd)) {
    if (isPositiveNumber(blockRangeEnd)) {
      gsWhere['transfer'] = gsWhere['transfer'] as Where || {};
      gsWhere['transfer']['blockNumber_lte'] = blockRangeEnd;
    } else {
      return throwError(() => 'Provided end block must be a positive number.');
    }
  }

  if (isDefined(accountIdHex)) {
    if (isString(accountIdHex)) {
      gsWhere['account'] = gsWhere['account'] as Where || {};
      gsWhere['account'] = {'publicKey_eq': accountIdHex}
    }
  } else {
    // Remove duplicates by hard setting the direction.
    gsWhere['direction_eq'] = 'enum(To)';
  }

  if (isDefined(direction)) {
    if (isString(direction)) {
      if (direction.toLowerCase() === 'from') {
        gsWhere['direction_eq'] = 'enum(From)';
      } else if (direction.toLowerCase() === 'to') {
        gsWhere['direction_eq'] = 'enum(To)';
      } else {
        return throwError(() => `Provided variable direction must be 'from' or 'to'.`);
      }
    } else {
      return throwError(() => `Provided variable direction must be a string.`);
    }
  }


  const contentType = 'transfers';
  const orderBy = 'id_DESC';

  return adapter.queryGSMain<GSExplorerTransferInput[]>(
    contentType,
    gsExplorerTransferFields,
    gsWhere,
    orderBy,
    pageSize
  ).pipe(
    switchMap(
      (rawTransfers) => {
        if (!rawTransfers) {
          return throwError(() => new Error('Fetching transfers from subsquid failed.'));
        }

        if (rawTransfers && rawTransfers.length === 0) {
          return of([]);
        }

        return of(rawTransfers);
      }
    ),
    map((transfers) =>
      transfers.map<st.Transfer>((transfer) => {
        const splittenId = transfer.id.split('-');
        const eventIdx = parseInt(splittenId[1], 10)

        const result: types.Transfer = {
          blockNumber: transfer.transfer.blockNumber,
          blockDatetime: transfer.transfer.timestamp,
          eventIdx: eventIdx,
          amount: transfer.transfer.amount,
          extrinsicHash: transfer.transfer.extrinsicHash,
          from: transfer.transfer.from.publicKey,
          to: transfer.transfer.to.publicKey,
          success: transfer.transfer.success
        };

        if (direction || accountIdHex) {
          result.attributeName = transfer.direction.toLowerCase();
        }

        return result;
      })
    )
  );
};


export const getTransfers = (adapter: Adapter) => {
  const fn = (filters?: TransfersFilters, pageSize?: number) => {
    filters = filters || {};
    return getTransfersBase(
      adapter,
      pageSize,
      filters.blockNumber,
      filters.extrinsicHash,
      filters.success,
      filters.dateRangeBegin,
      filters.dateRangeEnd,
      filters.blockRangeBegin,
      filters.blockRangeEnd,
      filters.accountIdHex,
      filters.direction
    ).pipe(
      catchError((e: string) => throwError(() => new Error(`[SubsquidAdapter] getTransfers: ${e}`)))
    );
  };
  fn.identifiers = identifiers;
  return fn;
};


export const subscribeNewTransfersBase = (adapter: Adapter) =>
  (_filters?: TransfersFilters, accountIdHex?: string) => {
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

            return getTransfersBase(
              adapter,
              100,
              filters.blockNumber,
              filters.extrinsicHash,
              filters.success,
              filters.dateRangeBegin,
              filters.dateRangeEnd,
              filters.blockRangeBegin,
              filters.blockRangeEnd,
              accountIdHex || filters.accountIdHex,
              filters.direction
            ).pipe(
              tap((tranfers) => {
                if (tranfers.length > 0) {
                  // Check the last height that came from the response and reset the height to the next block number.
                  // The next cycle will start with the next block number.
                  height = tranfers[0].blockNumber + 1;
                  timestamp = tranfers[0].blockDatetime;
                }
              }),
              filter((events) => events.length > 0),
              switchMap((events) => of(...events.reverse()))
            );

            // On the next cycle try the next block with matching events;
            height += 1;
          })
        );
      }),
      catchError((e) => {
        console.error('[SubsquidAdapter] subscribeNewTransfer', e);
        return of(undefined);
      }),
      filter((e): e is types.Transfer => isObject(e))
    );
  };


export const subscribeNewTransfer = (adapter: Adapter) => {
  const fn = (filters?: TransfersFilters) =>
    subscribeNewTransfersBase(adapter)(filters);
  fn.identifiers = identifiers;
  return fn;
};


export const getTransfersByAccount = (adapter: Adapter) => {
  const fn = (accountIdHex: string, filters?: TransfersFilters, pageSize?: number) => {
    filters = filters || {};
    return getTransfersBase(
      adapter,
      pageSize,
      filters.blockNumber,
      filters.extrinsicHash,
      filters.success,
      filters.dateRangeBegin,
      filters.dateRangeEnd,
      filters.blockRangeBegin,
      filters.blockRangeEnd,
      accountIdHex,
      filters.direction
    ).pipe(
      catchError((e: string) => throwError(() => new Error(`[SubsquidAdapter] getTransfers: ${e}`)))
    );
  };
  fn.identifiers = identifiers;
  return fn;
};


export const subscribeNewTransferByAccount = (adapter: Adapter) => {
  const fn = (accountIdHex: string, filters?: TransfersFilters) =>
    subscribeNewTransfersBase(adapter)(filters, accountIdHex);
  fn.identifiers = identifiers;
  return fn;
};
