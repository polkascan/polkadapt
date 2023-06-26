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


import { Adapter } from '../polkascan-explorer';
import * as pst from '../polkascan-explorer.types';
import { types } from '@polkadapt/core';
import {
  createObjectsListObservable, createSubscriptionObservable,
  generateSubscriptionQuery,
  isDate,
  isDefined,
  isObject,
  isPositiveNumber,
  isString
} from './helpers';
import { filter, Observable } from 'rxjs';

const genericEventFields = [
  'blockNumber',
  'eventIdx',
  'attributeName',
  'accountId',
  'attributes',
  'pallet',
  'eventName',
  'blockDatetime',
  'sortValue',
  'extrinsicIdx'
];


export interface AccountEventsFilters {
  blockNumber?: number;
  eventIdx?: number;
  attributeName?: string;
  pallet?: string;
  eventName?: string;
  extrinsicIdx?: number;
  dateRangeBegin?: Date;
  dateRangeEnd?: Date;
  blockRangeBegin?: number;
  blockRangeEnd?: number;
  eventTypes?: {[pallet: string]: string[]};
}

const identifiers = ['blockNumber', 'eventIdx', 'attributeName'];

const createEventsByAccountFilters = (accountEventsFilters?: AccountEventsFilters): string[] => {
  const filters: string[] = [];

  if (accountEventsFilters && isObject(accountEventsFilters)) {
    const blockNumber = accountEventsFilters.blockNumber;
    const pallet = accountEventsFilters.pallet;
    const eventName = accountEventsFilters.eventName;
    const attributeName = accountEventsFilters.attributeName;
    const dateRangeBegin = accountEventsFilters.dateRangeBegin;
    const dateRangeEnd = accountEventsFilters.dateRangeEnd;
    const blockRangeBegin = accountEventsFilters.blockRangeBegin;
    const blockRangeEnd = accountEventsFilters.blockRangeEnd;
    const eventTypes = accountEventsFilters.eventTypes;

    if (isDefined(blockNumber)) {
      if (isPositiveNumber(blockNumber)) {
        filters.push(`blockNumber: ${blockNumber}`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] AccountEvents: Provided block number must be a positive number.');
      }
    }

    if (isDefined(eventTypes)) {
      const pairs = [];
      for (const [p, events] of Object.entries(eventTypes)) {
        pairs.push(`{ pallet: "${p}", eventNameIn: [${events.map(n => `"${n}"`).join(', ')}] }`);
      }
      filters.push(`or: [ ${pairs.join(' ')} ]`);
    } else {

      if (isDefined(pallet)) {
        if (isString(pallet)) {
          filters.push(`pallet: "${pallet}"`);
        } else {
          throw new Error('[PolkascanExplorerAdapter] AccountEvents: Provided pallet must be a non-empty string.');
        }
      }

      if (isDefined(eventName)) {
        if (isString(eventName)) {
          if (!isDefined(pallet)) {
            throw new Error('[PolkascanExplorerAdapter] AccountEvents: Missing pallet (string), only event name is provided.');
          }
          filters.push(`eventName: "${eventName}"`);
        } else {
          throw new Error('[PolkascanExplorerAdapter] AccountEvents: Provided event name must be a non-empty string.');
        }
      }

    }

    if (isDefined(attributeName)) {
      if (isString(attributeName)) {
        filters.push(`attributeName: "${attributeName}"`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] AccountEvents: Provided attribute name must be a non-empty string.');
      }
    }

    if (isDefined(dateRangeBegin) && isDefined(dateRangeEnd)) {
      if (isDate(dateRangeBegin) && isDate(dateRangeEnd)) {
        filters.push(`blockDatetimeRange: { begin: "${dateRangeBegin.toISOString()}", end: "${dateRangeEnd.toISOString()}" }`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] AccountEvents: Provided begin and end date must be a Date.');
      }
    } else if (isDefined(dateRangeBegin)) {
      if (isDate(dateRangeBegin)) {
        filters.push(`blockDatetimeGte: "${dateRangeBegin.toISOString()}"`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] AccountEvents: Provided begin date must be a Date.');
      }
    } else if (isDefined(dateRangeEnd)) {
      if (isDate(dateRangeEnd)) {
        filters.push(`blockDatetimeLte: "${dateRangeEnd.toISOString()}"`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] AccountEvents: Provided end date must be a Date.');
      }
    }

    if (isDefined(blockRangeBegin) && isDefined(blockRangeEnd)) {
      if (isPositiveNumber(blockRangeBegin) && isPositiveNumber(blockRangeEnd)) {
        filters.push(`blockNumberRange: { begin: ${blockRangeBegin}, end: ${blockRangeEnd} }`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] AccountEvents: Provided begin and end block must be a positive number.');
      }
    } else if (isDefined(blockRangeBegin)) {
      if (isPositiveNumber(blockRangeBegin)) {
        filters.push(`blockNumberGte: ${blockRangeBegin}`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] AccountEvents: Provided begin block must be a positive number.');
      }
    } else if (isDefined(blockRangeEnd)) {
      if (isPositiveNumber(blockRangeEnd)) {
        filters.push(`blockNumberLte: ${blockRangeEnd}`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] AccountEvents: Provided end block must be a positive number.');
      }
    }

  } else if (isDefined(accountEventsFilters)) {
    throw new Error('[PolkascanExplorerAdapter] AccountEvents: Provided filters have to be wrapped in an object.');
  }

  return filters;
};


export const getEventsByAccount = (adapter: Adapter) => {
  const fn = (accountIdHex: string,
         accountEventsFilters?: AccountEventsFilters,
         pageSize?: number): Observable<types.AccountEvent[]> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    if (!isDefined(accountIdHex)) {
      throw new Error('[PolkascanExplorerAdapter] getEventsByAccount: Provide an accountId (string).');
    }

    const filters: string[] = createEventsByAccountFilters(accountEventsFilters);
    filters.push(`accountId: "${accountIdHex}"`);
    const blockLimitOffset = accountEventsFilters && accountEventsFilters.blockRangeEnd ? accountEventsFilters.blockRangeEnd : undefined;
    return createObjectsListObservable<pst.AccountEvent>(
      adapter,
      'getEventsByAccount',
      genericEventFields,
      filters,
      identifiers,
      pageSize,
      blockLimitOffset
    );
  };
  fn.identifiers = identifiers;
  return fn;
};


export const subscribeNewEventByAccount = (adapter: Adapter) => {
  const fn = (accountIdHex: string, accountEventfilters?: AccountEventsFilters): Observable<types.AccountEvent> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    if (!isDefined(accountIdHex)) {
      throw new Error('[PolkascanExplorerAdapter] subscribeNewEventByAccount: Provide an accountId (string).');
    }

    if (!isString(accountIdHex)) {
      throw new Error('[PolkascanExplorerAdapter] subscribeNewEventByAccount: Provided accountId must be a string.');
    }

    let filters: string[] = [];
    if (isObject(accountEventfilters)) {
      filters = createEventsByAccountFilters(accountEventfilters);
    }
    filters.push(`accountId: "${accountIdHex}"`);

    const query = generateSubscriptionQuery('subscribeNewEventByAccount', genericEventFields, filters);
    return createSubscriptionObservable<pst.AccountEvent>(adapter, 'subscribeNewEventByAccount', query).pipe(
      filter((e): e is pst.AccountEvent => isObject(e))
    );
  };
  fn.identifiers = identifiers;
  return fn;
};
