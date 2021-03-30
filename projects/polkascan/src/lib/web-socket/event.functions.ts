/*
 * PolkADAPT
 *
 * Copyright 2020 Stichting Polkascan (Polkascan Foundation)
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


import { Adapter } from '../polkascan';
import * as pst from '../polkascan.types';
import {
  generateObjectQuery,
  generateObjectsListQuery,
  generateSubscription,
  isArray,
  isBlockNumber,
  isDefined,
  isEventIdx,
  isFunction,
  isObject,
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
  'attributes'
];

export interface EventsFilters {
  blockNumber?: number;
  eventModule?: string;
  eventName?: string;
}


export const getEvent = (adapter: Adapter) => {
  return async (blockNumber?: number, eventIdx?: number): Promise<pst.Event> => {
    const filters: string[] = [];

    if (isDefined(blockNumber) && isBlockNumber(blockNumber)) {
      if (!isDefined(eventIdx)) {
        throw new Error('[PolkascanAdapter] getEvent: Missing eventIdx, only blockNumber is provided.');
      }
      filters.push(`blockNumber: ${blockNumber}`);
    } else {
      throw new Error('[PolkascanAdapter] getEvent: Provided attribute blockNumber must be an integer.');
    }

    if (isDefined(eventIdx) && isEventIdx(eventIdx)) {
      if (!isDefined(blockNumber)) {
        throw new Error('[PolkascanAdapter] getEvent: Missing attribute blockNumber, only eventIdx is provided.');
      }
      filters.push(`eventIdx: ${eventIdx}`);
    } else {
      throw new Error('[PolkascanAdapter] getEvent: Provided attribute eventIdx must be an integer.');
    }

    const query = generateObjectQuery('getEvent', genericEventFields, filters);

    const result = await adapter.socket.query(query);
    const event: pst.Event = result.getEvent;
    if (isObject(event)) {
      return event;
    } else {
      throw new Error(`[PolkascanAdapter] getEvent: Returned response is invalid.`);
    }
  };
};


const createEventsFilters = (eventsFilters: EventsFilters): string[] => {
  const filters: string[] = [];

  if (isObject(eventsFilters)) {
    const blockNumber = eventsFilters.blockNumber;
    const eventModule = eventsFilters.eventModule;
    const eventName = eventsFilters.eventName;

    if (isDefined(blockNumber)) {
      if (isBlockNumber(blockNumber)) {
        filters.push(`blockNumber: ${blockNumber}`);
      } else {
        throw new Error('[PolkascanAdapter] Events: Provided attribute blockNumber must be an integer.');
      }
    }

    if (isDefined(eventModule)) {
      if (isString(eventModule)) {
        filters.push(`eventModule: "${eventModule}"`);
      } else {
        throw new Error('[PolkascanAdapter] Events: Provided attribute eventModule must be a (non-empty) string.');
      }
    }

    if (isDefined(eventName)) {
      if (isString(eventName)) {
        if (!isDefined(eventModule)) {
          throw new Error('[PolkascanAdapter] Events: Missing attribute eventModule, only eventName is provided.');
        }
        filters.push(`eventName: "${eventName}"`);
      } else {
        throw new Error('[PolkascanAdapter] Events: Provided attribute eventName must be a (non-empty) string.');
      }
    }

  } else if (isDefined(eventsFilters)) {
    throw new Error('[PolkascanAdapter] Events: Provided attribute filters have to be wrapped in an object.');
  }

  return filters;
};


export const getEvents = (adapter: Adapter) => {
  return async (eventsFilters?: EventsFilters, pageSize?: number, pageKey?: string): Promise<pst.ListResponse<pst.Event>> => {
    let filters: string[];
    try {
      filters = createEventsFilters(eventsFilters);
    } catch (e) {
      throw new Error(e);
    }

    const query = generateObjectsListQuery('getEvents', genericEventFields, filters, pageSize, pageKey);

    let result;
    let events: Event[];
    try {
      result = await adapter.socket.query(query);
      events = result.getEvents.objects;
    } catch (e) {
      throw new Error(e);
    }
    if (isArray(events)) {
      return result.getEvents;
    } else {
      throw new Error(`[PolkascanAdapter] getEvents: Returned response is invalid.`);
    }
  };
};


export const subscribeNewEvent = (adapter: Adapter) => {
  return async (...args: ((event: pst.Event) => void | EventsFilters)[]): Promise<() => void> => {
    const callback = args.find((arg) => isFunction(arg));
    if (!callback) {
      throw new Error(`[PolkascanAdapter] subscribeNewEvent: No callback function is provided.`);
    }

    let filters: string[];
    if (isObject(args[0])) {
      try {
        filters = createEventsFilters(args[0] as EventsFilters);
      } catch (e) {
        throw new Error(e);
      }
    }

    const query = generateSubscription('subscribeNewEvent', genericEventFields, filters);

    // return the unsubscribe function.
    return await adapter.socket.createSubscription(query, (result) => {
      try {
        const event: pst.Event = result.subscribeNewEvent;
        if (isObject(event)) {
          callback(event);
        }
      } catch (e) {
        // Ignore.
      }
    });
  };
};
