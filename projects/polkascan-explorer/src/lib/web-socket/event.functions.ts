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
  generateObjectQuery,
  generateObjectsListQuery,
  generateSubscriptionQuery,
  isArray, isDate,
  isDefined,
  isFunction,
  isNumber,
  isObject,
  isPositiveNumber,
  isString
} from './helpers';

const genericEventFields = [
  'blockNumber',
  'eventIdx',
  'extrinsicIdx',
  'event',
  'eventModule',
  'eventName',
  'blockDatetime',
  'blockHash',
  'attributes',
  'specName',
  'specVersion'
];


export interface EventsFilters {
  blockNumber?: number;
  eventModule?: string;
  eventName?: string;
  extrinsicIdx?: number;
  specName?: string;
  specVersion?: number;
  dateRangeBegin?: Date;
  dateRangeEnd?: Date;
  blockRangeBegin?: number;
  blockRangeEnd?: number;
}


export const getEvent = (adapter: Adapter) => async (blockNumber: number, eventIdx: number): Promise<pst.Event> => {
  if (!adapter.socket) {
    throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
  }

  const filters: string[] = [];

  if (!isDefined(blockNumber)) {
    throw new Error('[PolkascanExplorerAdapter] getEvent: Provide a block number (number).');
  }

  if (!isDefined(eventIdx)) {
    throw new Error('[PolkascanExplorerAdapter] getEvent: Provide an eventIdx (number).');
  }

  if (isPositiveNumber(blockNumber)) {
    filters.push(`blockNumber: ${blockNumber}`);
  } else {
    throw new Error('[PolkascanExplorerAdapter] getEvent: Provided block number must be a positive number.');
  }

  if (isPositiveNumber(eventIdx)) {
    filters.push(`eventIdx: ${eventIdx}`);
  } else {
    throw new Error('[PolkascanExplorerAdapter] getEvent: Provided eventIdx must be a positive number.');
  }

  const query = generateObjectQuery('getEvent', genericEventFields, filters);
  const result = await adapter.socket.query(query) as { getEvent: pst.Event };
  const event = result.getEvent;
  if (event === null || isObject(event)) {
    return event;
  } else {
    throw new Error(`[PolkascanExplorerAdapter] getEvent: Returned response is invalid.`);
  }
};


const createEventsFilters = (eventsFilters?: EventsFilters): string[] => {
  const filters: string[] = [];

  if (eventsFilters && isObject(eventsFilters)) {
    const blockNumber = eventsFilters.blockNumber;
    const eventModule = eventsFilters.eventModule;
    const eventName = eventsFilters.eventName;
    const extrinsicIdx = eventsFilters.extrinsicIdx;
    const specName = eventsFilters.specName;
    const specVersion = eventsFilters.specVersion;
    const dateRangeBegin = eventsFilters.dateRangeBegin;
    const dateRangeEnd = eventsFilters.dateRangeEnd;
    const blockRangeBegin = eventsFilters.blockRangeBegin;
    const blockRangeEnd = eventsFilters.blockRangeEnd;

    if (isDefined(blockNumber)) {
      if (isPositiveNumber(blockNumber)) {
        filters.push(`blockNumber: ${blockNumber}`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Events: Provided block number must be a positive number.');
      }
    }

    if (isDefined(eventModule)) {
      if (isString(eventModule)) {
        filters.push(`eventModule: "${eventModule}"`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Events: Provided event module must be a non-empty string.');
      }
    }

    if (isDefined(eventName)) {
      if (isString(eventName)) {
        if (!isDefined(eventModule)) {
          throw new Error('[PolkascanExplorerAdapter] Events: Missing event module (string), only event name is provided.');
        }
        filters.push(`eventName: "${eventName}"`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Events: Provided event name must be a non-empty string.');
      }
    }

    if (isDefined(extrinsicIdx)) {
      if (isPositiveNumber(extrinsicIdx)) {
        if (!isDefined(blockNumber)) {
          throw new Error('[PolkascanExplorerAdapter] Events: Missing block number (number), only extrinsicIdx is provided.');
        }
        filters.push(`extrinsicIdx: ${extrinsicIdx}`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Events: Provided extrinsicIdx must be a positive number.');
      }
    }

    if (isDefined(specName)) {
      if (isString(specName)) {
        filters.push(`specName: "${specName}"`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Events: Provided spec name must be a non-empty string.');
      }
    }

    if (isDefined(specVersion)) {
      if (isNumber(specVersion)) {
        filters.push(`specVersion: ${specVersion}`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Events: Provided spec version must be a number.');
      }
    }

    if (isDefined(dateRangeBegin) && isDefined(dateRangeEnd)) {
      if (isDate(dateRangeBegin) && isDate(dateRangeEnd)) {
        filters.push(`blockDatetimeRange: { begin: "${dateRangeBegin.toISOString()}", end: "${dateRangeEnd.toISOString()}" }`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Events: Provided begin and end date must be a Date.');
      }
    } else if (isDefined(dateRangeBegin)) {
      if (isDate(dateRangeBegin)) {
        filters.push(`blockDatetimeGte: "${dateRangeBegin.toISOString()}"`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Events: Provided begin date must be a Date.');
      }
    } else if (isDefined(dateRangeEnd)) {
      if (isDate(dateRangeEnd)) {
        filters.push(`blockDatetimeLte: "${dateRangeEnd.toISOString()}"`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Events: Provided end date must be a Date.');
      }
    }

    if (isDefined(blockRangeBegin) && isDefined(blockRangeEnd)) {
      if (isPositiveNumber(blockRangeBegin) && isPositiveNumber(blockRangeEnd)) {
        filters.push(`blockNumberRange: { begin: ${blockRangeBegin}, end: ${blockRangeEnd} }`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Events: Provided begin and end block must be a positive number.');
      }
    } else if (isDefined(blockRangeBegin)) {
      if (isPositiveNumber(blockRangeBegin)) {
        filters.push(`blockNumberGte: ${blockRangeBegin}`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Events: Provided begin block must be a positive number.');
      }
    } else if (isDefined(blockRangeEnd)) {
      if (isPositiveNumber(blockRangeEnd)) {
        filters.push(`blockNumberLte: ${blockRangeEnd}`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] Events: Provided end block must be a positive number.');
      }
    }

  } else if (isDefined(eventsFilters)) {
    throw new Error('[PolkascanExplorerAdapter] Events: Provided filters have to be wrapped in an object.');
  }

  return filters;
};


export const getEvents = (adapter: Adapter) =>
  async (eventsFilters?: EventsFilters,
         pageSize?: number,
         pageKey?: string,
         blockLimitOffset?: number,
         blockLimitCount?: number): Promise<pst.ListResponse<pst.Event>> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const filters: string[] = createEventsFilters(eventsFilters);
    const query = generateObjectsListQuery('getEvents',
      genericEventFields, filters, pageSize, pageKey, blockLimitOffset, blockLimitCount
    );
    const result = await adapter.socket.query(query) as { getEvents: pst.ListResponse<pst.Event> };
    const events = result.getEvents.objects;

    if (isArray(events)) {
      return result.getEvents;
    } else {
      throw new Error(`[PolkascanExplorerAdapter] getEvents: Returned response is invalid.`);
    }
  };


export const subscribeNewEvent = (adapter: Adapter) =>
  async (...args: (((event: pst.Event) => void) | EventsFilters | undefined)[]): Promise<() => void> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const callback = args.find((arg) => isFunction(arg)) as (undefined | ((event: pst.Event) => void));
    if (!callback) {
      throw new Error(`[PolkascanExplorerAdapter] subscribeNewEvent: No callback function is provided.`);
    }

    let filters: string[] = [];
    if (isObject(args[0])) {
      filters = createEventsFilters(args[0] as EventsFilters);
    }

    const query = generateSubscriptionQuery('subscribeNewEvent', genericEventFields, filters);
    // return the unsubscribe function.
    return await adapter.socket.createSubscription(query, (result: { subscribeNewEvent: pst.Event }) => {
      try {
        const event = result.subscribeNewEvent;
        if (isObject(event)) {
          callback(event);
        }
      } catch (e) {
        // Ignore.
      }
    });
  };
