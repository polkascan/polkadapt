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
  isDefined,
  isObject,
  isPositiveNumber
} from './helpers';
import { filter, Observable } from 'rxjs';

const genericLogFields = [
  'blockNumber',
  'logIdx',
  'typeId',
  'typeName',
  'data',
  'blockDatetime',
  'blockHash',
  'specName',
  'specVersion',
  'complete'
];

export interface LogsFilters {
  blockRangeEnd?: number;
}


const identifiers = ['blockNumber', 'logIdx'];

export const getLog = (adapter: Adapter) => {
  const fn = (blockNumber: number, logIdx: number): Observable<types.Log> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const filters: string[] = [];

    if (!isDefined(blockNumber)) {
      throw new Error(`[PolkascanExplorerAdapter] getLog: Provide a block number (number).`);
    }

    if (!isDefined(logIdx)) {
      throw new Error(`[PolkascanExplorerAdapter] getLog: Provide an logIdx (number).`);
    }

    if (isPositiveNumber(blockNumber)) {
      filters.push(`blockNumber: ${blockNumber}`);
    } else {
      throw new Error(`[PolkascanExplorerAdapter] getLog: Provided block number must be a positive number.`);
    }

    if (isPositiveNumber(logIdx)) {
      filters.push(`logIdx: ${logIdx}`);
    } else {
      throw new Error(`[PolkascanExplorerAdapter] getLog: Provided logIdx must be a positive number.`);
    }

    const query = generateObjectQuery('getLog', genericLogFields, filters);
    return createObjectObservable<pst.Log>(adapter, 'getLog', query);
  };
  fn.identifiers = identifiers;
  return fn;
};


export const getLogs = (adapter: Adapter) => {
  const fn = (logFilters?: LogsFilters, pageSize?: number): Observable<types.Log[]> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const blockLimitOffset = logFilters && logFilters.blockRangeEnd ? logFilters.blockRangeEnd : undefined;
    return createObjectsListObservable<types.Log>(adapter, 'getLogs', genericLogFields, undefined, identifiers, pageSize, blockLimitOffset);
  };
  fn.identifiers = identifiers;
  return fn;
};


export const subscribeNewLog = (adapter: Adapter) => {
  const fn = (): Observable<types.Log> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const query = generateSubscriptionQuery('subscribeNewLog', genericLogFields);
    return createSubscriptionObservable<pst.Log>(adapter, 'subscribeNewLog', query).pipe(
      filter((l) => isObject(l))
    );
  };
  fn.identifiers = fn;
  return fn;
};
