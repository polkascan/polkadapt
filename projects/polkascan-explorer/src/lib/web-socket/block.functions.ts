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
import { types } from '@polkadapt/core';
import {
  createSharedObservable,
  generateObjectQuery,
  generateObjectsListQuery,
  generateSubscriptionQuery,
  isArray,
  isBlockHash,
  isFunction,
  isObject,
  isPositiveNumber
} from './helpers';
import { map, Observable, ReplaySubject, Subject, take } from 'rxjs';

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


export const getBlock = (adapter: Adapter) =>
  (hashOrNumber: string | number): Observable<types.Block> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] getBlock: Websocket unavailable.');
    }

    const filters: string[] = [];

    if (isBlockHash(hashOrNumber)) {
      filters.push(`hash: "${hashOrNumber}"`);
    } else if (isPositiveNumber(hashOrNumber)) {
      filters.push(`number: ${hashOrNumber}`);
    } else {
      throw new Error('[PolkascanExplorerAdapter] getBlock: Provide a block hash (string) or block number (number).');
    }

    const subject = new ReplaySubject<types.Block>(1);
    const query = generateObjectQuery('getBlock', genericBlockFields, filters);
    const promise = adapter.socket.query(query) as Promise<{ getBlock: pst.Block | null }>;

    promise.then(
      (response) => {
        const block = response.getBlock;
        if (block === null) {
          subject.error(new Error(`[PolkascanExplorerAdapter] getBlock: Block not found.`));
        } else if (isObject(block)) {
          subject.next(block as types.Block);
        } else {
          subject.error(new Error(`[PolkascanExplorerAdapter] getBlock: Returned response is invalid.`));
        }
      },
      (reason) => {
        subject.error(reason);
      });

    return subject.pipe(take(1));
  };


const getBlocksFn = (adapter: Adapter, direction?: 'from' | 'until') =>
  async (hashOrNumber?: string | number,
         pageSize?: number,
         pageKey?: string,
         blockLimitOffset?: number,
         blockLimitCount?: number
  ): Promise<pst.ListResponse<pst.Block>> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const filters: string[] = [];

    if (direction === 'from') {
      if (isBlockHash(hashOrNumber)) {
        filters.push(`hashFrom: "${hashOrNumber}"`);
      } else if (isPositiveNumber(hashOrNumber)) {
        filters.push(`numberGte: ${hashOrNumber}`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] getBlocksFrom: Provide a block hash (string) or block number (number).');
      }
    } else if (direction === 'until') {
      if (isBlockHash(hashOrNumber)) {
        filters.push(`hashUntil: "${hashOrNumber}"`);
      } else if (isPositiveNumber(hashOrNumber)) {
        filters.push(`numberLte: ${hashOrNumber}`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] getBlocksUntil: Provide a block hash (string) or block number (number).');
      }
    }

    const query = generateObjectsListQuery('getBlocks', genericBlockFields, filters, pageSize, pageKey, blockLimitOffset, blockLimitCount);
    const result = await adapter.socket.query(query) as { getBlocks: pst.ListResponse<pst.Block> };
    const blocks: pst.Block[] = result.getBlocks.objects;
    if (isArray(blocks)) {
      return result.getBlocks;
    } else {
      throw new Error(`[PolkascanExplorerAdapter] getBlocks: Returned response is invalid.`);
    }
  };


export const getLatestBlock = (adapter: Adapter) =>
  (): Observable<types.Block> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const subject = new ReplaySubject<types.Block>(1);
    const query = generateObjectQuery('getLatestBlock', genericBlockFields, []);
    const promise = adapter.socket.query(query) as Promise<{ getLatestBlock: pst.Block }>;

    promise.then(
      (response) => {
        const block = response.getLatestBlock;
        if (isObject(block)) {
          subject.next(block as types.Block);
        } else {
          subject.error(`[PolkascanExplorerAdapter] getLatestBlock: Returned response is invalid.`);
        }
      },
      (reason) => {
        subject.error(reason);
      });

    return subject.pipe(take(1));
  };


export const getBlocks = (adapter: Adapter) =>
  (pageSize?: number, pageKey?: string, blockLimitOffset?: number, blockLimitCount?: number) =>
    getBlocksFn(adapter)(undefined, pageSize, pageKey, blockLimitOffset, blockLimitCount);


export const getBlocksFrom = (adapter: Adapter) => getBlocksFn(adapter, 'from');


export const getBlocksUntil = (adapter: Adapter) => getBlocksFn(adapter, 'until');


export const subscribeNewBlock = (adapter: Adapter) =>
  (): Observable<types.Block> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const query = generateSubscriptionQuery('subscribeNewBlock', genericBlockFields);

    const observable = createSharedObservable<{ subscribeNewBlock: pst.Block }>(adapter, query);
    return observable.pipe(
      map((result) => {
        const block: types.Block = result.subscribeNewBlock;
        if (isObject(block)) {
          return block;
        } else {
          throw new Error('[PolkascanExplorerAdapter] subscribeNewBlock Returned response is invalid.');
        }
      })
    );
  };
