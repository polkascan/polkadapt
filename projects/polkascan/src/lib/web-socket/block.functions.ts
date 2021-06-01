/*
 * PolkADAPT
 *
 * Copyright 2020-2021 Polkascan Foundation (NL)
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
  'slotNumber',
  'specVersion',
  'complete'
];


export const getBlock = (adapter: Adapter) => {
  return async (hashOrNumber: string | number): Promise<pst.Block> => {
    const filters: string[] = [];

    if (isBlockHash(hashOrNumber)) {
      filters.push(`hash: "${hashOrNumber}"`);
    } else if (isPositiveNumber(hashOrNumber)) {
      filters.push(`number: ${hashOrNumber}`);
    } else {
      throw new Error('[PolkascanAdapter] getBlock: Provide a block hash (string) or block number (number).');
    }

    const query = generateObjectQuery('getBlock', genericBlockFields, filters);

    const result = adapter.socket ? await adapter.socket.query(query) : {};
    const block: pst.Block = result.getBlock;
    if (isObject(block)) {
      return block;
    } else {
      throw new Error(`[PolkascanAdapter] getBlock: Returned response is invalid.`);
    }
  };
};


const getBlocksFn = (adapter: Adapter, direction?: 'from' | 'until') => {
  return async (hashOrNumber?: string | number,
                pageSize?: number,
                pageKey?: string
  ): Promise<pst.ListResponse<pst.Block>> => {

    const filters: string[] = [];

    if (direction === 'from') {
      if (isBlockHash(hashOrNumber)) {
        filters.push(`hashFrom: "${hashOrNumber}"`);
      } else if (isPositiveNumber(hashOrNumber)) {
        filters.push(`numberGte: ${hashOrNumber}`);
      } else {
        throw new Error('[PolkascanAdapter] getBlocksFrom: Provide a block hash (string) or block number (number).');
      }
    } else if (direction === 'until') {
      if (isBlockHash(hashOrNumber)) {
        filters.push(`hashUntil: "${hashOrNumber}"`);
      } else if (isPositiveNumber(hashOrNumber)) {
        filters.push(`numberLte: ${hashOrNumber}`);
      } else {
        throw new Error('[PolkascanAdapter] getBlocksUntil: Provide a block hash (string) or block number (number).');
      }
    }

    const query = generateObjectsListQuery('getBlocks', genericBlockFields, filters, pageSize, pageKey);

    const result = adapter.socket ? await adapter.socket.query(query) : {};
    const blocks: pst.Block[] = result.getBlocks.objects;
    if (isArray(blocks)) {
      return result.getBlocks;
    } else {
      throw new Error(`[PolkascanAdapter] getBlocks: Returned response is invalid.`);
    }
  };
};


export const getLatestBlock = (adapter: Adapter) => {
  return async (): Promise<pst.Block> => {
    const query = generateObjectQuery('getLatestBlock', genericBlockFields, []);
    const result = adapter.socket ? await adapter.socket.query(query) : {};
    const block: pst.Block = result.getLatestBlock;
    if (isObject(block)) {
      return block;
    } else {
      throw new Error(`[PolkascanAdapter] getLatestBlock: Returned response is invalid.`);
    }
  };
};


export const getBlocks = (adapter: Adapter) => {
  return (pageSize?: number, pageKey?: string) => {
    return getBlocksFn(adapter)(undefined, pageSize, pageKey);
  };
};


export const getBlocksFrom = (adapter: Adapter) => {
  return getBlocksFn(adapter, 'from');
};


export const getBlocksUntil = (adapter: Adapter) => {
  return getBlocksFn(adapter, 'until');
};


export const subscribeNewBlock = (adapter: Adapter) => {
  return async (...args: ((block: pst.Block) => void)[]): Promise<() => void> => {
    const callback = args.find((arg) => isFunction(arg));
    if (!callback) {
      throw new Error(`[PolkascanAdapter] subscribeNewBlock: No callback function is provided.`);
    }

    const query = generateSubscription('subscribeNewBlock', genericBlockFields);

    // return the unsubscribe function.
    return !adapter.socket ? {} : await adapter.socket.createSubscription(query, (result) => {
      try {
        const block: pst.Block = result.subscribeNewBlock;
        if (isObject(block)) {
          callback(block);
        }
      } catch (e) {
        // Ignore.
      }
    });
  };
};


export const getBlockAugmentation = (adapter: Adapter) => {
  return async (hash: string): Promise<any> => {
    if (!isBlockHash(hash)) {
      throw new Error('[PolkascanAdapter] getBlock (augmentation): Hash must be of type string.');
    }

    // Get data from polkascan to augment it to the rpc block.

    const fields = ['countExtrinsics', 'countEvents'];
    const filters = [`hash: "${hash}"`];
    const query = generateObjectQuery('getBlock', fields, filters);

    try {
      const result = adapter.socket ? await adapter.socket.query(query) : {};
      const block: pst.Block = result.getBlock;
      if (isObject(block)) {
        return {block};
      }
      return {};

    } catch (e) {
      // Ignore failure. We won't augment the block into the rpc fetched block;
      return {};
    }
  };
};
