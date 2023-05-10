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

import { types } from '@polkadapt/core';
import { BlockHash, BlockNumber, EventRecord, Header, SignedBlock } from '@polkadot/types/interfaces';
import { Vec } from '@polkadot/types';
import { Observable, of, from, map, switchMap, combineLatestWith } from 'rxjs';
import { Adapter } from '../substrate-rpc';

const identifiers = ['number'];

export const getBlock = (adapter: Adapter) => {
  const fn = (hashOrNumber: string | number): Observable<types.Block> =>
    from(adapter.apiPromise).pipe(
      switchMap(api => {
        let blockHash: Observable<BlockHash> | null = null;
        if (typeof hashOrNumber === 'string' && hashOrNumber.length > 0) {
          blockHash = of(api.registry.createType('BlockHash', hashOrNumber) as unknown as BlockHash);
        }
        if (typeof hashOrNumber === 'number') {
          const blockNumber: BlockNumber = api.registry.createType('BlockNumber', hashOrNumber);
          blockHash = api.rpc.chain.getBlockHash(blockNumber);
        }
        if (blockHash) {
          return of(api).pipe(
            combineLatestWith(blockHash)
          );
        }
        throw new Error('[Substrate RPC Adapter] getBlock could not generate blockHash.');
      }),
      switchMap(([api, blockHash]) =>
        of(blockHash).pipe(
          combineLatestWith(
            api.rpc.chain.getBlock(blockHash),
            api.query.system.events.at(blockHash),
            api.query.timestamp.now.at(blockHash)
          )
        )
      ),
      map(([blockHash, signedBlock, events, timestamp]) => {
        const block: types.Block = {} as types.Block;
        block.hash = blockHash.toString();
        if (signedBlock) {
          // eslint-disable-next-line id-blacklist
          block.number = signedBlock.block.header.number.toNumber();
          block.parentHash = signedBlock.block.header.parentHash.toString();
          block.extrinsicsRoot = signedBlock.block.header.extrinsicsRoot.toString();
          block.stateRoot = signedBlock.block.header.stateRoot.toString();
          block.countLogs = signedBlock.block.header.digest.logs.length;
          block.countExtrinsics = signedBlock.block.extrinsics.length;
          block.extrinsics = signedBlock.block.extrinsics.toJSON() as any[];  // TODO Fix typing
        }
        if (events) {
          block.countEvents = (events as Vec<EventRecord>).length;
          block.events = events.toJSON() as any[];  // TODO Fix typing
        }
        if (timestamp) {
          block.datetime = new Date(parseInt(timestamp.toString(), 10)).toISOString();
        }

        return block;
      })
    );
  fn.identifiers = identifiers;
  return fn;
};

export const getLatestBlock = (adapter: Adapter) => {


  const fn = (): Observable<types.Block> =>
    from(adapter.apiPromise).pipe(
      switchMap(api => api.rpc.chain.getBlockHash()),
      switchMap(blockHash => getBlock(adapter)(blockHash.toString()))
    );
  fn.identifiers = identifiers;
};

export const subscribeNewBlock = (adapter: Adapter) => {
  const fn = (): Observable<types.Block> =>
    from(adapter.apiPromise).pipe(
      switchMap(api => api.rpc.chain.subscribeNewHeads()),
      switchMap(header => getBlock(adapter)(header.number.toNumber()))
    );
  fn.identifiers = identifiers;
  return fn;
};
