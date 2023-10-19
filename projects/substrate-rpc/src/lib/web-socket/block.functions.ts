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

import { types } from '@polkadapt/core';
import { BlockHash, BlockNumber, EventRecord, Extrinsic } from '@polkadot/types/interfaces';
import { Vec } from '@polkadot/types';
import { combineLatestWith, from, map, Observable, of, switchMap, throwError } from 'rxjs';
import { Adapter } from '../substrate-rpc';

const identifiers = ['number'];


type rawBlock = {
  // eslint-disable-next-line id-blacklist
  number: number;
  hash: string;
  parentHash: string;
  stateRoot: string;
  extrinsicsRoot: string;
  datetime: string | null;
  countExtrinsics: number;
  countEvents: number;
  countLogs: number;
  extrinsics: Vec<Extrinsic>;
  events: Vec<EventRecord>;
  specName: string;
  specVersion: number;
};


export const getBlockBase = (adapter: Adapter) =>
  (hashOrNumber: string | number): Observable<rawBlock> =>
    from(adapter.apiPromise).pipe(
      switchMap(api => {
        let blockHash: Observable<BlockHash> | null = null;
        if (typeof hashOrNumber === 'string' && hashOrNumber.length > 0) {
          blockHash = of(api.registry.createType('BlockHash', hashOrNumber) as unknown as BlockHash);
        }
        if (Number.isInteger(hashOrNumber)) {
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
            api.query.timestamp.now.at(blockHash),
            api.query.system.lastRuntimeUpgrade.at(blockHash)
          )
        )
      ),
      map(([blockHash, signedBlock, events, timestamp, runtime]) => {
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
          block.extrinsics = signedBlock.block.extrinsics as Vec<Extrinsic>;
        }
        if (events) {
          block.countEvents = (events as Vec<EventRecord>).length;
          block.events = events as Vec<EventRecord>;
        }
        if (timestamp) {
          block.datetime = new Date(parseInt(timestamp.toString(), 10)).toISOString();
        }
        if (runtime) {
          const r = runtime.toJSON() as { specName: string, specVersion: number };
          block.specName = r.specName;
          block.specVersion = r.specVersion;
        }

        return block as rawBlock;
      })
    );

export const getBlock = (adapter: Adapter) => {
  const fn = (hashOrNumber: string | number): Observable<types.Block> =>
    getBlockBase(adapter)(hashOrNumber).pipe(
      map((block) => {
        let events = {};
        let extrinsics = {};

        if (block.extrinsics) {
          extrinsics = {extrinsics: block.extrinsics.toJSON()};
        }
        if (block.events) {
          events = {events: block.events.toJSON()};
        }
        return Object.assign({}, block, events, extrinsics) as types.Block;
      })
    )
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
  return fn;
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


export const getBlockHash = (adapter: Adapter) =>
  (blockNumber: number): Observable<string> =>
    from(adapter.apiPromise).pipe(
      switchMap((api) => api.rpc.chain.getBlockHash(blockNumber)),
      map((hash) => {
        if (hash) {
          return hash.toJSON();
        }
        throw new Error('[Substrate RPC Adapter] getBlockHash: returned invalid.');
      })
    );


export const getFinalizedHead = (adapter: Adapter) =>
  (): Observable<string> =>
    from(adapter.apiPromise).pipe(
      switchMap((api) => api.rpc.chain.getFinalizedHead()),
      map((hash) => {
        if (hash) {
          return hash.toJSON();
        }
        throw new Error('[Substrate RPC Adapter] getFinalizedHead: returned invalid.');
      })
    );


export const getTimestamp = (adapter: Adapter) =>
  (hashOrNumber?: number | string): Observable<number> =>
    from(adapter.apiPromise).pipe(
      switchMap((api) => {
        let blockHash: Observable<BlockHash> | null = null;
        if (typeof hashOrNumber === 'string' && hashOrNumber.length > 0) {
          blockHash = of(api.registry.createType('BlockHash', hashOrNumber) as unknown as BlockHash);
        }
        if (Number.isInteger(hashOrNumber)) {
          const blockNumber: BlockNumber = api.registry.createType('BlockNumber', hashOrNumber);
          blockHash = api.rpc.chain.getBlockHash(blockNumber);
        }
        if (blockHash) {
          return blockHash.pipe(
            switchMap((hash) => api.query.timestamp.now.at(hash))
          ).pipe(
            map((timestamp) => {
              if (timestamp && timestamp.isEmpty === false) {
                return timestamp.toJSON() as number;
              }
              throw new Error('[Substrate RPC Adapter] getTimestamp: returned invalid.');
            })
          );
        }

        return api.query.timestamp.now().pipe(
          map((timestamp) => {
            if (timestamp && timestamp.isEmpty === false) {
              timestamp.toJSON() as number;
            }
            throw new Error('[Substrate RPC Adapter] getTimestamp: returned invalid.');
          })
        );
      })
    );


export const getHeader = (adapter: Adapter) =>
  (hashOrNumber?: number | string): Observable<types.Header> =>
    from(adapter.apiPromise).pipe(
      switchMap((api) => {
        let blockHash: Observable<BlockHash> | null = null;

        const createBlockHashObservable = () => {
          const blockNumber: BlockNumber = api.registry.createType('BlockNumber', hashOrNumber);
          blockHash = api.rpc.chain.getBlockHash(blockNumber);
        };

        if (Number.isInteger(hashOrNumber)) {
          createBlockHashObservable();
        }

        if (typeof hashOrNumber === 'string' && hashOrNumber.length > 0) {
          if (`${Number.parseInt(hashOrNumber, 10)}` === hashOrNumber) {
            // String is probably a blockNumber, not a hash.
            createBlockHashObservable();
          } else {
            // String is probably a hash. Generate a blockhash observable.
            blockHash = of(api.registry.createType('BlockHash', hashOrNumber) as unknown as BlockHash);
          }
        }
        if (blockHash) {
          return blockHash.pipe(
            switchMap((hash) => api.rpc.chain.getHeader(hash)),
            map((header) => ({
              // eslint-disable-next-line id-blacklist
              number: header.number.toJSON(),
              parentHash: header.parentHash.toJSON(),
              stateRoot: header.stateRoot.toJSON(),
              extrinsicsRoot: header.extrinsicsRoot.toJSON(),
            } as types.Header))
          );
        }
        return throwError(() => new Error('[Substrate RPC Adapter] getHeader: Could not fetch header.'));
      })
    );
