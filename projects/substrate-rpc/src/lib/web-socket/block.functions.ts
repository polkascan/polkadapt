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


import { Adapter } from '../substrate-rpc';
import * as types from '../substrate-rpc.types';
import { BlockHash, BlockNumber, Header, SignedBlock } from '@polkadot/types/interfaces';
import { U64 } from '@polkadot/types';

export const getBlock = (adapter: Adapter) =>
  async (hashOrNumber: string | number): Promise<types.Block> => {

    const api = await adapter.polkadotJsPromise;
    let blockHash: BlockHash | undefined;

    try {
      if (typeof hashOrNumber === 'string' && hashOrNumber.length > 0) {
        blockHash = api.registry.createType('BlockHash', hashOrNumber) as unknown as BlockHash;
      }
    } catch (e) {
      // Could not generate blockHash
    }

    if (!blockHash) {
      try {
        if (typeof hashOrNumber === 'number') {
          const blockNumber: BlockNumber = api.registry.createType('BlockNumber', hashOrNumber);
          blockHash = await api.rpc.chain.getBlockHash(blockNumber);
        }
      } catch (e) {
        // Could not generate blockHash
      }
    }

    if (!blockHash) {
      throw new Error('[Substrate RPC Adapter] getBlock could not generate blockHash.');
    }

    const block: types.Block = {} as types.Block;
    block.hash = blockHash.toString();

    const [signedBlock, events, timestamp] = (await Promise.allSettled([
      api.rpc.chain.getBlock(blockHash),
      api.query.system.events.at(blockHash),
      api.query.timestamp.now.at(blockHash)
    ])).map((p) => p.status === 'fulfilled' ? p.value : null) as [SignedBlock, any[], U64];

    if (signedBlock) {
      block.number = signedBlock.block.header.number.toNumber();
      block.parentHash = signedBlock.block.header.parentHash.toString();
      block.extrinsicsRoot = signedBlock.block.header.extrinsicsRoot.toString();
      block.stateRoot = signedBlock.block.header.stateRoot.toString();
      block.countLogs = signedBlock.block.header.digest.logs.length;
      block.countExtrinsics = signedBlock.block.extrinsics.length;
    }
    if (events) {
      block.countEvents = events.length;
    }
    if (timestamp) {
      block.datetime = new Date(parseInt(timestamp.toString(), 10)).toISOString();
    }

    return block;
  };

export const getLatestBlock = (adapter: Adapter) =>
  async (): Promise<types.Block> => {
    const api = await adapter.polkadotJsPromise;
    const latestBlock = await api.rpc.chain.getBlockHash();
    return await getBlock(adapter)(latestBlock.toString());
  };


export const subscribeNewBlock = (adapter: Adapter) =>
  async (...args: ((block: types.Block) => void)[]): Promise<() => void> => {
    const api = await adapter.polkadotJsPromise;
    const fn = async (header: Header) => {
      const block = await getBlock(adapter)(header.number.toNumber());
      args[0](block);
    };

    const unsub = await api.rpc.chain.subscribeNewHeads(fn);

    return unsub;
  };

