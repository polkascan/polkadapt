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
  generateSubscription,
  isArray,
  isBlockHash,
  isFunction,
  isObject,
  isPositiveNumber
} from './helpers';

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
  async (hashOrNumber: string | number): Promise<pst.Block> => {
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

    const query = generateObjectQuery('getBlock', genericBlockFields, filters);
    const result = await adapter.socket.query(query) as { getBlock: pst.Block };
    const block = result.getBlock;
    if (isObject(block)) {
      return block;
    } else {
      throw new Error(`[PolkascanExplorerAdapter] getBlock: Returned response is invalid.`);
    }
  };


const getBlocksFn = (adapter: Adapter, direction?: 'from' | 'until') =>
  async (hashOrNumber?: string | number,
         pageSize?: number,
         pageKey?: string
  ): Promise<pst.ListResponse<pst.Block>> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const filters: string[] = [];

    if (direction === 'from') {
      if (isBlockHash(hashOrNumber)) {
        filters.push(`hashFrom: "${hashOrNumber as string}"`);
      } else if (isPositiveNumber(hashOrNumber)) {
        filters.push(`numberGte: ${hashOrNumber as number}`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] getBlocksFrom: Provide a block hash (string) or block number (number).');
      }
    } else if (direction === 'until') {
      if (isBlockHash(hashOrNumber)) {
        filters.push(`hashUntil: "${hashOrNumber as string}"`);
      } else if (isPositiveNumber(hashOrNumber)) {
        filters.push(`numberLte: ${hashOrNumber as number}`);
      } else {
        throw new Error('[PolkascanExplorerAdapter] getBlocksUntil: Provide a block hash (string) or block number (number).');
      }
    }

    const query = generateObjectsListQuery('getBlocks', genericBlockFields, filters, pageSize, pageKey);
    const result = await adapter.socket.query(query) as { getBlocks: pst.ListResponse<pst.Block> };
    const blocks: pst.Block[] = result.getBlocks.objects;
    if (isArray(blocks)) {
      return result.getBlocks;
    } else {
      throw new Error(`[PolkascanExplorerAdapter] getBlocks: Returned response is invalid.`);
    }
  };


export const getLatestBlock = (adapter: Adapter) =>
  async (): Promise<pst.Block> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const query = generateObjectQuery('getLatestBlock', genericBlockFields, []);
    const result = await adapter.socket.query(query) as { getLatestBlock: pst.Block };
    const block = result.getLatestBlock;
    if (isObject(block)) {
      return block;
    } else {
      throw new Error(`[PolkascanExplorerAdapter] getLatestBlock: Returned response is invalid.`);
    }
  };


export const getBlocks = (adapter: Adapter) =>
  (pageSize?: number, pageKey?: string) => getBlocksFn(adapter)(undefined, pageSize, pageKey);


export const getBlocksFrom = (adapter: Adapter) => getBlocksFn(adapter, 'from');


export const getBlocksUntil = (adapter: Adapter) => getBlocksFn(adapter, 'until');


export const subscribeNewBlock = (adapter: Adapter) =>
  async (...args: ((block: pst.Block) => void)[]): Promise<() => void> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const callback = args.find((arg) => isFunction(arg));
    if (!callback) {
      throw new Error(`[PolkascanExplorerAdapter] subscribeNewBlock: No callback function is provided.`);
    }

    const query = generateSubscription('subscribeNewBlock', genericBlockFields);
    // return the unsubscribe function.
    return await adapter.socket.createSubscription(query, (result: { subscribeNewBlock: pst.Block }) => {
      const block: pst.Block = result.subscribeNewBlock;
      if (isObject(block)) {
        callback(block);
      }
    });
  };


export const getBlockAugmentation = (adapter: Adapter) =>
  async (hash: string): Promise<any> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    if (!isBlockHash(hash)) {
      throw new Error('[PolkascanExplorerAdapter] getBlock (augmentation): Hash must be of type string.');
    }

    // Get data from polkascan to augment it to the rpc block.
    const fields = ['countExtrinsics', 'countEvents'];
    const filters = [`hash: "${hash}"`];
    const query = generateObjectQuery('getBlock', fields, filters);

    try {
      const result = await adapter.socket.query(query) as { getBlock: pst.Block };
      const block = result.getBlock;
      if (isObject(block)) {
        return {block};
      }
      return {};

    } catch (e) {
      // Ignore failure. We won't augment the block into the rpc fetched block;
      return {};
    }
  };
