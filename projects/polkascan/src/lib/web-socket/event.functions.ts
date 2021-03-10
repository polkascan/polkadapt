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
import { generateObjectQuery, generateObjectsListQuery, isBlockNumber, isEventIdx } from './helpers';

const genericEventFields = [
  'blockNumber',
  'eventIdx',
  'extrinsicIdx',
  'event',
  'eventModule',
  'eventName',
  'blockDatetime',
  'blockHash'
];

export interface EventsFilters {
  blockNumber?: number;
  eventModule?: string;
  eventName?: string;
}


export const getEvent = (adapter: Adapter) => {
  return async (blockNumber?: number, eventIdx?: number): Promise<pst.Event> => {
    const filters: string[] = [];

    if (blockNumber !== null && blockNumber !== undefined && isBlockNumber(blockNumber)) {
      filters.push(`blockNumberEq: ${blockNumber}`);
    } else {
      throw new Error('[PolkascanAdapter] getEvent: Supplied blockNumber must be an integer.');
    }

    if (eventIdx !== null && eventIdx !== undefined && isEventIdx(eventIdx)) {
      filters.push(`eventIdxEq: ${eventIdx}`);
    } else {
      throw new Error('[PolkascanAdapter] getEvent: Supplied eventIdx  must be an integer.');
    }

    const query = generateObjectQuery('getEvent', genericEventFields, filters);

    try {
      const result = await adapter.socket.query(query);
      return result.getEvent as pst.Event;
    } catch (e) {
      throw new Error(e);
    }
  };
};


export const getEvents = (adapter: Adapter) => {
  return async (eventsFilters?: EventsFilters, pageSize?: number, pageKey?: string): Promise<pst.ListResponse<pst.Event>> => {
    const filters: string[] = [];

    if (eventsFilters) {
      const blockNumber = eventsFilters.blockNumber;
      const eventModule = eventsFilters.eventModule;
      const eventName = eventsFilters.eventName;

      if (blockNumber !== null && blockNumber !== undefined && isBlockNumber(blockNumber)) {
        filters.push(`blockNumberEq: ${blockNumber}`);
      } else {
        throw new Error('[PolkascanAdapter] getEvents: Supplied blockNumber must be an integer.');
      }

      if (eventModule && typeof eventModule === 'string') {
        filters.push(`eventModuleEq: ${eventModule}`);
      } else {
        throw new Error('[PolkascanAdapter] getEvents: Supplied eventModule must be a string.');
      }

      if (eventName && typeof eventName === 'string') {
        filters.push(`eventNameEq: ${eventName}`);
      } else {
        throw new Error('[PolkascanAdapter] getEvents: Supplied eventName must be a string.');
      }
    }

    const query = generateObjectsListQuery('getEvents', genericEventFields, filters, pageSize, pageKey);

    try {
      const result = await adapter.socket.query(query);
      return result.getEvents;
    } catch (e) {
      throw new Error(e);
    }
  };
};


export const subscribeNewEvent = (adapter: Adapter) => {
  return async (callback: (block: pst.Event) => void): Promise<() => void> => {
    const query = `subscription { subscribeNewEvent { ${genericEventFields.join(', ')} } }`;
    // return the unsubscribe function.
    return await adapter.socket.createSubscription(query, (result) => {
      try {
        const event: pst.Event = result.subscribeNewEvent;
        callback(event);
      } catch (e) {
        // Ignore.
      }
    });
  };
};


