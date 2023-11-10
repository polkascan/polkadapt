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
  isHash,
  isObject,
  isPositiveNumber
} from './helpers';
import { map, Observable } from 'rxjs';

const genericBlockFields = [
  'number',
  'hash',
  'parentHash',
  'stateRoot',
  'extrinsicsRoot',
  'countExtrinsics',
  'countEvents',
  'datetime',
  'specName',
  'specVersion',
  'complete'
];

const identifiers = ['number'];

export const getBlock = (adapter: Adapter) => {
  const fn = (hashOrNumber: string | number): Observable<types.Block> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] getBlock: Websocket unavailable.');
    }

    const filters: string[] = [];

    if (isHash(hashOrNumber)) {
      filters.push(`hash: "${hashOrNumber}"`);
    } else if (isPositiveNumber(hashOrNumber)) {
      filters.push(`number: ${hashOrNumber}`);
    } else {
      throw new Error('[PolkascanExplorerAdapter] getBlock: Provide a block hash (string) or block number (number).');
    }

    const query = generateObjectQuery('getBlock', genericBlockFields, filters);
    return createObjectObservable<pst.Block>(adapter, 'getBlock', query).pipe(
      map((block) => {
        if (isObject(block)) {
          return block;
        } else {
          throw new Error(`[PolkascanExplorerAdapter] 'GetBlock': Block not found.`);
        }
      })
    );
  };
  fn.identifiers = identifiers;
  return fn;
};

const getBlocksFn = (adapter: Adapter, direction?: 'from' | 'until') =>
  (hashOrNumber?: string | number,
   pageSize?: number
  ): Observable<pst.Block[]> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const filters: string[] = [];

    if (direction === 'from') {
      if (isHash(hashOrNumber)) {
        filters.push(`hashFrom: "${hashOrNumber}"`);
      } else if (isPositiveNumber(hashOrNumber)) {
        filters.push(`numberGte: ${hashOrNumber}`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] getBlocksFrom: Provide a block hash (string) or block number (number).');
      }
    } else if (direction === 'until') {
      if (isHash(hashOrNumber)) {
        filters.push(`hashUntil: "${hashOrNumber}"`);
      } else if (isPositiveNumber(hashOrNumber)) {
        filters.push(`numberLte: ${hashOrNumber}`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] getBlocksUntil: Provide a block hash (string) or block number (number).');
      }
    }

    return createObjectsListObservable<pst.Block>(adapter, 'getBlocks', genericBlockFields, filters, identifiers, pageSize);
  };


export const getLatestBlock = (adapter: Adapter) => {
  const fn = (): Observable<types.Block> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const query = generateObjectQuery('getLatestBlock', genericBlockFields, []);
    return createObjectObservable<pst.Block>(adapter, 'getLatestBlock', query).pipe(
      map((block) => {
        if (isObject(block)) {
          return block;
        } else {
          throw new Error(`[PolkascanExplorerAdapter] 'getLatestBlock': Object not found.`);
        }
      })
    );
  };
  fn.identifiers = identifiers;
  return fn;
};


export const getBlocks = (adapter: Adapter) => {
  const fn = (pageSize?: number) =>
    getBlocksFn(adapter)(undefined, pageSize);
  fn.identifiers = identifiers;
  return fn;
};

export const getBlocksFrom = (adapter: Adapter) => {
  const fn = (hashOrNumber: string | number, pageSize?: number) =>
    getBlocksFn(adapter, 'from')(hashOrNumber, pageSize);
  fn.identifiers = identifiers;
  return fn;
};


export const getBlocksUntil = (adapter: Adapter) => {
  const fn = (hashOrNumber: string | number, pageSize?: number) =>
    getBlocksFn(adapter, 'until')(hashOrNumber, pageSize);
  fn.identifiers = identifiers;
  return fn;
};


export const subscribeNewBlock = (adapter: Adapter) => {
  const fn = (): Observable<types.Block> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const query = generateSubscriptionQuery('subscribeNewBlock', genericBlockFields);
    return createSubscriptionObservable<pst.Block>(adapter, 'subscribeNewBlock', query);
  };
  fn.identifiers = identifiers;
  return fn;
};
