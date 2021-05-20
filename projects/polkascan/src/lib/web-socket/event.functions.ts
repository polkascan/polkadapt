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
  generateObjectQuery, generateObjectsListQuery, generateSubscription, isArray, isDefined, isFunction, isObject,
  isPositiveNumber, isString
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
  extrinsicIdx?: number;
}


export const getEvent = (adapter: Adapter) => {
  return async (blockNumber: number, eventIdx: number): Promise<pst.Event> => {
    const filters: string[] = [];

    if (!isDefined(blockNumber)) {
      throw new Error('[PolkascanAdapter] getEvent: Provide a block number (number).');
    }

    if (!isDefined(eventIdx)) {
      throw new Error('[PolkascanAdapter] getEvent: Provide an eventIdx (number).');
    }

    if (isPositiveNumber(blockNumber)) {
      filters.push(`blockNumber: ${blockNumber}`);
    } else {
      throw new Error('[PolkascanAdapter] getEvent: Provided block number must be a positive number.');
    }

    if (isPositiveNumber(eventIdx)) {
      filters.push(`eventIdx: ${eventIdx}`);
    } else {
      throw new Error('[PolkascanAdapter] getEvent: Provided eventIdx must be a positive number.');
    }

    const query = generateObjectQuery('getEvent', genericEventFields, filters);

    const result = adapter.socket ? await adapter.socket.query(query) : {};
    const event: pst.Event = result.getEvent;
    if (isObject(event)) {
      return event;
    } else {
      throw new Error(`[PolkascanAdapter] getEvent: Returned response is invalid.`);
    }
  };
};


const createEventsFilters = (eventsFilters?: EventsFilters): string[] => {
  const filters: string[] = [];

  if (eventsFilters && isObject(eventsFilters)) {
    const blockNumber = eventsFilters.blockNumber;
    const eventModule = eventsFilters.eventModule;
    const eventName = eventsFilters.eventName;
    const extrinsicIdx = eventsFilters.extrinsicIdx;

    if (isDefined(blockNumber)) {
      if (isPositiveNumber(blockNumber)) {
        filters.push(`blockNumber: ${blockNumber}`);
      } else {
        throw new Error('[PolkascanAdapter] Events: Provided block number must be a positive number.');
      }
    }

    if (isDefined(eventModule)) {
      if (isString(eventModule)) {
        filters.push(`eventModule: "${eventModule}"`);
      } else {
        throw new Error('[PolkascanAdapter] Events: Provided event module must be a non-empty string.');
      }
    }

    if (isDefined(eventName)) {
      if (isString(eventName)) {
        if (!isDefined(eventModule)) {
          throw new Error('[PolkascanAdapter] Events: Missing event module (string), only event name is provided.');
        }
        filters.push(`eventName: "${eventName}"`);
      } else {
        throw new Error('[PolkascanAdapter] Events: Provided event name must be a non-empty string.');
      }
    }

    if (isDefined(extrinsicIdx)) {
      if (isPositiveNumber(extrinsicIdx)) {
        if (!isDefined(blockNumber)) {
          throw new Error('[PolkascanAdapter] Events: Missing block number (number), only extrinsicIdx is provided.');
        }
        filters.push(`extrinsicIdx: ${extrinsicIdx}`);
      } else {
        throw new Error('[PolkascanAdapter] Events: Provided extrinsicIdx must be a positive number.');
      }
    }

  } else if (isDefined(eventsFilters)) {
    throw new Error('[PolkascanAdapter] Events: Provided filters have to be wrapped in an object.');
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
    let events: pst.Event[];
    try {
      result = adapter.socket ? await adapter.socket.query(query) : {};
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
  return async (...args: (((event: pst.Event) => void) | EventsFilters | undefined)[]): Promise<() => void> => {
    const callback = args.find((arg) => isFunction(arg)) as (undefined | ((event: pst.Event) => void));
    if (!callback) {
      throw new Error(`[PolkascanAdapter] subscribeNewEvent: No callback function is provided.`);
    }

    let filters: string[] = [];
    if (isObject(args[0])) {
      try {
        filters = createEventsFilters(args[0] as EventsFilters);
      } catch (e) {
        throw new Error(e);
      }
    }

    const query = generateSubscription('subscribeNewEvent', genericEventFields, filters);

    // return the unsubscribe function.
    return !adapter.socket ? {} : await adapter.socket.createSubscription(query, (result) => {
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
