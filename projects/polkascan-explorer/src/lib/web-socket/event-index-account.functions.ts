/*
 * PolkADAPT
 *
 * Copyright 2020-2022 Polkascan Foundation (NL)
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
import {
  generateObjectsListQuery,
  generateSubscription,
  isArray,
  isDate,
  isDefined,
  isFunction,
  isObject,
  isPositiveNumber,
  isString
} from './helpers';

const genericEventFields = [
  'blockNumber',
  'eventIdx',
  'attributeIndex',
  'accountId',
  'attributes',
  'pallet',
  'eventName',
  'blockDatetime',
  'sortValue',
  'extrinsicIdx'
];


export interface EventsIndexAccountFilters {
  blockNumber?: number;
  eventIdx?: number;
  attributeIndex?: number;
  pallet?: string;
  eventName?: string;
  extrinsicIdx?: number;
  dateRangeBegin?: Date;
  dateRangeEnd?: Date;
  blockRangeBegin?: number;
  blockRangeEnd?: number;
}


const createEventsForAccountFilters = (eventsIndexAccountFilters?: EventsIndexAccountFilters): string[] => {
  const filters: string[] = [];

  if (eventsIndexAccountFilters && isObject(eventsIndexAccountFilters)) {
    const blockNumber = eventsIndexAccountFilters.blockNumber;
    const eventIdx = eventsIndexAccountFilters.eventIdx;
    const attributeIndex = eventsIndexAccountFilters.attributeIndex;
    const pallet = eventsIndexAccountFilters.pallet;
    const eventName = eventsIndexAccountFilters.eventName;
    const extrinsicIdx = eventsIndexAccountFilters.extrinsicIdx;
    const dateRangeBegin = eventsIndexAccountFilters.dateRangeBegin;
    const dateRangeEnd = eventsIndexAccountFilters.dateRangeEnd;
    const blockRangeBegin = eventsIndexAccountFilters.blockRangeBegin;
    const blockRangeEnd = eventsIndexAccountFilters.blockRangeEnd;

    if (isDefined(blockNumber)) {
      if (isPositiveNumber(blockNumber)) {
        filters.push(`blockNumber: ${blockNumber}`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] EventsIndexAccount: Provided block number must be a positive number.');
      }
    }

    if (isDefined(eventIdx)) {
      if (isPositiveNumber(eventIdx)) {
        filters.push(`eventIdx: ${eventIdx}`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] EventsIndexAccount: Provided eventIdx must be a positive number.');
      }
    }

    if (isDefined(attributeIndex)) {
      if (isPositiveNumber(attributeIndex)) {
        filters.push(`attributeIndex: ${attributeIndex}`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] EventsIndexAccount: Provided attributeIndex must be a positive number.');
      }
    }

    if (isDefined(pallet)) {
      if (isString(pallet)) {
        filters.push(`eventModule: "${pallet}"`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] EventsIndexAccount: Provided pallet must be a non-empty string.');
      }
    }

    if (isDefined(eventName)) {
      if (isString(eventName)) {
        if (!isDefined(pallet)) {
          throw new Error('[PolkascanExplorerAdapter] EventsIndexAccount: Missing pallet (string), only event name is provided.');
        }
        filters.push(`eventName: "${eventName}"`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] EventsIndexAccount: Provided event name must be a non-empty string.');
      }
    }

    if (isDefined(extrinsicIdx)) {
      if (isPositiveNumber(extrinsicIdx)) {
        if (!isDefined(blockNumber)) {
          throw new Error('[PolkascanExplorerAdapter] EventsIndexAccount: Missing block number (number), only extrinsicIdx is provided.');
        }
        filters.push(`extrinsicIdx: ${extrinsicIdx}`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] EventsIndexAccount: Provided extrinsicIdx must be a positive number.');
      }
    }

    if (isDefined(dateRangeBegin) && isDefined(dateRangeEnd)) {
      if (isDate(dateRangeBegin) && isDate(dateRangeEnd)) {
        filters.push(`blockDatetimeRange: { begin: "${dateRangeBegin.toISOString()}", end: "${dateRangeEnd.toISOString()}" }`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] EventsIndexAccount: Provided begin and end date must be a Date.');
      }
    } else if (isDefined(dateRangeBegin)) {
      if (isDate(dateRangeBegin)) {
        filters.push(`blockDatetimeGte: "${dateRangeBegin.toISOString()}"`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] EventsIndexAccount: Provided begin date must be a Date.');
      }
    } else if (isDefined(dateRangeEnd)) {
      if (isDate(dateRangeEnd)) {
        filters.push(`blockDatetimeLte: "${dateRangeEnd.toISOString()}"`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] EventsIndexAccount: Provided end date must be a Date.');
      }
    }

    if (isDefined(blockRangeBegin) && isDefined(blockRangeEnd)) {
      if (isPositiveNumber(blockRangeBegin) && isPositiveNumber(blockRangeEnd)) {
        filters.push(`blockNumberRange: { begin: ${blockRangeBegin}, end: ${blockRangeEnd} }`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] EventsIndexAccount: Provided begin and end block must be a positive number.');
      }
    } else if (isDefined(blockRangeBegin)) {
      if (isPositiveNumber(blockRangeBegin)) {
        filters.push(`blockNumberGte: ${blockRangeBegin}`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] EventsIndexAccount: Provided begin block must be a positive number.');
      }
    } else if (isDefined(blockRangeEnd)) {
      if (isPositiveNumber(blockRangeEnd)) {
        filters.push(`blockNumberLte: ${blockRangeEnd}`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] EventsIndexAccount: Provided end block must be a positive number.');
      }
    }

  } else if (isDefined(eventsIndexAccountFilters)) {
    throw new Error('[PolkascanExplorerAdapter] EventsIndexAccount: Provided filters have to be wrapped in an object.');
  }

  return filters;
};


export const getEventsForAccount = (adapter: Adapter) =>
  async (accountId: string,
         eventsIndexAccountFilters?: EventsIndexAccountFilters,
         pageSize?: number,
         pageKey?: string,
         blockLimitOffset?: number,
         blockLimitCount?: number): Promise<pst.ListResponse<pst.EventIndexAccount>> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    if (!isDefined(accountId)) {
      throw new Error('[PolkascanExplorerAdapter] getEventsForAccount: Provide an accountId (string).');
    }

    const filters: string[] = createEventsForAccountFilters(eventsIndexAccountFilters);
    filters.push(`accountId: "${accountId}"`);

    const query = generateObjectsListQuery('getEventsForAccount',
      genericEventFields, filters, pageSize, pageKey, blockLimitOffset, blockLimitCount
    );
    const result = await adapter.socket.query(query) as { getEventsForAccount: pst.ListResponse<pst.EventIndexAccount> };
    const events = result.getEventsForAccount.objects;

    if (isArray(events)) {
      return result.getEventsForAccount;
    } else {
      throw new Error(`[PolkascanExplorerAdapter] getEventsForAccount: Returned response is invalid.`);
    }
  };


export const subscribeNewEventForAccount = (adapter: Adapter) =>
  async (accountId: string,
         ...args: (((event: pst.EventIndexAccount) => void) | EventsIndexAccountFilters | undefined)[]): Promise<() => void> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    if (!isDefined(accountId)) {
      throw new Error('[PolkascanExplorerAdapter] subscribeNewEventForAccount: Provide an accountId (string).');
    }

    if (!isString(accountId)) {
      throw new Error('[PolkascanExplorerAdapter] subscribeNewEventForAccount: Provided accountId must be a string.');
    }

    const callback = args.find((arg) => isFunction(arg)) as (undefined | ((event: pst.EventIndexAccount) => void));
    if (!callback) {
      throw new Error(`[PolkascanExplorerAdapter] subscribeNewEventForAccount: No callback function is provided.`);
    }

    let filters: string[] = [];
    filters.push(`accountId: "${accountId}"`);

    if (isObject(args[1])) {
      filters = createEventsForAccountFilters(args[0] as EventsIndexAccountFilters);
    }

    const query = generateSubscription('subscribeNewEventForAccount', genericEventFields, filters);
    // return the unsubscribe function.
    return await adapter.socket.createSubscription(query, (result: { subscribeNewEventForAccount: pst.EventIndexAccount }) => {
      try {
        const event = result.subscribeNewEventForAccount;
        if (isObject(event)) {
          callback(event);
        }
      } catch (e) {
        // Ignore.
      }
    });
  };
