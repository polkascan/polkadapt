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
import { generateObjectsListQuery, generateObjectQuery, isBlockHash, isBlockNumber } from './helpers';

// TODO Remove id when socket returns 'number' attribute as pk, add number.
const genericBlockFields = [
  'id',
  'hash',
  'parentHash',
  'stateRoot',
  'extrinsicsRoot',
  'countExtrinsics',
  'countEvents'
];


export const getBlock = (adapter: Adapter) => {
  return async (hashOrNumber?: string | number): Promise<pst.Block> => {
    const filters: string[] = [];

    if (isBlockHash(hashOrNumber)) {
      // Fetch specific block;
      filters.push(`filters: { hashEq: "${hashOrNumber}" }`);
    } else if (isBlockNumber(hashOrNumber)) {
      filters.push(`filters: { id: ${hashOrNumber} }`);
    } else if (hashOrNumber !== undefined || hashOrNumber !== null) {
      throw new Error('[PolkascanAdapter] getBlock: Supplied hashOrNumber is defined and must be of type string or integer.');
    }

    const query = generateObjectQuery('getBlock', genericBlockFields, filters);

    try {
      const result = await adapter.socket.query(query);
      const block: pst.Block = result.getBlock;
      if ((block as any).id) {
        block.number = parseInt((block as any).id, 10);  // TODO Remove me when socket returns 'number' attribute as pk.
      }
      return block;
    } catch (e) {
      throw new Error(e);
    }
  };
};


const getBlocksFn = (adapter: Adapter, direction?: 'from' | 'until') => {
  return async (hashOrNumber: string | number,
                pageSize?: number,
                pageKey?: string
  ): Promise<pst.ListResponse<pst.Block>> => {

    const filters: string[] = [];

    if (direction === 'from') {
      if (isBlockHash(hashOrNumber)) {
        filters.push(`hashFrom: "${hashOrNumber}"`);
      } else if (isBlockNumber(hashOrNumber)) {
        filters.push(`idGte: ${hashOrNumber}`);
      } else {
        throw new Error('[PolkascanAdapter] getBlocksFrom: Supplied hashOrNumber must be of type string or integer.');
      }
    } else if (direction === 'until') {
      if (isBlockHash(hashOrNumber)) {
        filters.push(`hashUntil: "${hashOrNumber}"`);
      } else if (isBlockNumber(hashOrNumber)) {
        filters.push(`idLte: ${hashOrNumber}`);
      } else {
        throw new Error('[PolkascanAdapter] getBlocksUntil: Supplied hashOrNumber must be of type string or integer.');
      }
    }

    const query = generateObjectsListQuery('getBlocks', genericBlockFields, filters, pageSize, pageKey);

    try {
      // @ts-ignore
      const result = await adapter.socket.query(query);
      const blocks: pst.Block[] = result.getBlocks.objects;
      blocks.forEach((block) => {
        if ((block as any).id) {
          block.number = parseInt((block as any).id, 10);  // TODO Remove me when socket returns 'number' attribute as pk.
        }
      });
      return result.getBlocks;
    } catch (e) {
      throw new Error(e);
    }
  };
};


export const getBlocks = (adapter: Adapter) => {
  return (pageSize?: number, pageKey?: string) => {
    return getBlocksFn(adapter)(null, pageSize, pageKey);
  };
};


export const getBlocksFrom = (adapter: Adapter) => {
  return getBlocksFn(adapter, 'from');
};


export const getBlocksUntil = (adapter: Adapter) => {
  return getBlocksFn(adapter, 'until');
};


export const subscribeNewBlock = (adapter: Adapter) => {
  return async (callback: (block: pst.Block) => void): Promise<() => void> => {
    const query = `subscription { subscribeNewBlock { ${genericBlockFields.join(', ')} } }`;
    // return the unsubscribe function.
    return await adapter.socket.createSubscription(query, (result) => {
      try {
        const block: pst.Block = result.subscribeNewBlock;
        if ((block as any).id) {
          block.number = parseInt((block as any).id, 10);  // TODO Remove me when socket returns 'number' attribute as pk.
        }
        callback(block);
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

    const fields = ['id', 'countExtrinsics', 'countEvents'];
    const filters = [`hash: "${hash}"`];
    const query = generateObjectQuery('getBlock', fields, filters);

    try {
      const result = await adapter.socket.query(query);
      const block: pst.Block = result.getBlock;
      if ((block as any).id) {
        block.number = parseInt((block as any).id, 10);  // TODO Remove me when socket returns 'number' attribute as pk.
      }
      return {block};
    } catch (e) {
      // Ignore failure. We won't augment the block into the rpc fetched block;
      return {};
    }
  };
};
