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
  createObjectObservable,
  createObjectsListObservable,
  createSubscriptionObservable,
  generateObjectQuery,
  generateSubscriptionQuery,
  isDate,
  isDefined,
  isNumber,
  isObject,
  isPositiveNumber,
  isString
} from './helpers';
import { Observable } from 'rxjs';

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

const identifiers = ['blockNumber', 'eventIdx'];

export const getEvent = (adapter: Adapter) => {
  const fn = (blockNumber: number, eventIdx: number): Observable<types.Event> => {
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
    return createObjectObservable<pst.Event>(adapter, 'getEvent', query);
  };
  fn.identifiers = identifiers;
  return fn;
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


export const getEvents = (adapter: Adapter) => {
  const fn = (eventsFilters?: EventsFilters, pageSize?: number): Observable<types.Event[]> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const filters: string[] = createEventsFilters(eventsFilters);
    const blockLimitOffset = eventsFilters && eventsFilters.blockRangeEnd ? eventsFilters.blockRangeEnd : undefined;
    return createObjectsListObservable<pst.Event>(
      adapter,
      'getEvents',
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


export const subscribeNewEvent = (adapter: Adapter) => {
  const fn = (eventsFilters?: EventsFilters): Observable<types.Event> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    let filters: string[] = [];
    if (isObject(eventsFilters)) {
      filters = createEventsFilters(eventsFilters);
    }

    const query = generateSubscriptionQuery('subscribeNewEvent', genericEventFields, filters);
    return createSubscriptionObservable<pst.Event>(adapter, 'subscribeNewEvent', query);
  };
  fn.identifiers = identifiers;
  return fn;
};
