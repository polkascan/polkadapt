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
import { catchError, filter, map, merge, Observable, of, switchMap, take, tap, throwError, timer } from 'rxjs';
import * as st from '../subsquid.types';
import { Adapter, Where } from '../subsquid';
import { isHash, isNumber, isObject } from './helpers';

export type GSExplorerBlockInput = {
  height: number;
  hash: string;
  parentHash: string;
  specVersion: number;
  timestamp: string;
  validator: string;
  extrinsicsCount: number;
  callsCount: number;
  eventsCount: number;
}[];

const identifiers = ['number'];

export const getBlocksBase = (
  adapter: Adapter,
  pageSize?: number,
  hashOrNumber?: string | number,
  fromNumber?: string | number,
  untilNumber?: string | number): Observable<types.Block[]> => {
  const contentType = 'blocks';
  let orderBy: string | undefined = 'id_DESC';

  let where: Where | undefined;
  if (typeof hashOrNumber !== 'undefined') {
    const whereKey = (typeof hashOrNumber === 'string' && hashOrNumber.startsWith('0x')) ? 'hash_eq' : 'height_eq';
    where = {};
    where[whereKey] = hashOrNumber;
    orderBy = undefined;
  }

  if (typeof fromNumber !== 'undefined') {
    where = {};
    where['height_gte'] = fromNumber;
  }

  if (typeof untilNumber !== 'undefined') {
    where = {};
    where['height_lte'] = untilNumber;
  }

  return merge(
    adapter.queryGSExplorer<GSExplorerBlockInput>(
      contentType,
      ['height', 'hash', 'parentHash', 'specVersion', 'timestamp', 'validator', 'callsCount', 'eventsCount', 'extrinsicsCount'],
      where,
      orderBy,
      pageSize
    ).pipe(
      map(blocks => blocks.map<st.GSExplorerBlockOutput>(block => ({
        // eslint-disable-next-line id-blacklist
        number: block.height,
        hash: block.hash,
        parentHash: block.parentHash,
        specVersion: block.specVersion,
        datetime: block.timestamp,
        authorAccountId: block.validator,
        countCalls: block.callsCount,
        countEvents: block.eventsCount,
        countExtrinsics: block.extrinsicsCount,
        complete: 1
      })))
    )
  );
};

export const getBlock = (adapter: Adapter) => {
  const fn = (hashOrNumber: string | number) =>
    getBlocksBase(adapter, 1, hashOrNumber).pipe(
      map(blocks => blocks[0])
    );
  fn.identifiers = identifiers;
  return fn;
};

export const getLatestBlock = (adapter: Adapter) => {
  const fn = () =>
    getBlocksBase(adapter, 1).pipe(
      map(blocks => blocks[0])
    );
  fn.identifiers = identifiers;
  return fn;
};

export const getBlocks = (adapter: Adapter) => {
  const fn = (pageSize?: number) =>
    getBlocksBase(adapter, pageSize);
  fn.identifiers = identifiers;
  return fn;
};

export const getBlocksFrom = (adapter: Adapter) => {
  const fn = (hashOrNumber: string | number, pageSize?: number) => {
    if (isNumber(hashOrNumber)) {
      return getBlocksBase(adapter, pageSize, undefined, hashOrNumber);
    } else if (isHash(hashOrNumber)) {
      // Find number for block hash;
      return getBlocksBase(adapter, 1, hashOrNumber).pipe(
        take(1),
        map((blocks) => {
          if (blocks[0]) {
            return blocks[0];
          }
          throw new Error('[SubsquidAdapter] getBlocksFrom: Could not find block.');
        }),
        switchMap((block) =>
          getBlocksBase(adapter, pageSize, undefined, block.number)
        )
      );
    } else {
      return throwError('[SubsquidAdapter] getBlocksFrom: Invalid block hash or number.');
    }
  };
  fn.identifiers = identifiers;
  return fn;
};

export const getBlocksUntil = (adapter: Adapter) => {
  const fn = (hashOrNumber: string | number, pageSize?: number) => {
    if (isNumber(hashOrNumber)) {
      return getBlocksBase(adapter, pageSize, undefined, undefined, hashOrNumber);
    } else if (isHash(hashOrNumber)) {
      return getBlocksBase(adapter, 1, hashOrNumber).pipe(
        take(1),
        map((blocks) => {
          if (blocks[0]) {
            return blocks[0];
          }
          throw new Error(`[SubsquidAdapter] getBlocksUntil: Could not find block with hash ${hashOrNumber}.`);
        }),
        switchMap((block) =>
          getBlocksBase(adapter, pageSize, undefined, undefined, block.number)
        )
      );
    } else {
      return throwError('[SubsquidAdapter] getBlocksUntil: Invalid block hash or number.');
    }
  };
  fn.identifiers = identifiers;
  return fn;
};

export const subscribeNewBlock = (adapter: Adapter) => {
  let height: number | undefined;
  let ignoreHeight: number | undefined;

  const fn = () => timer(0, 6000).pipe(
    switchMap(() =>
      getBlocksBase(adapter, 1).pipe(
        filter((blocks) => blocks && blocks[0] && blocks[0].number !== ignoreHeight),
        switchMap((blocks) => {
          if (blocks.length === 1) {
            const prevHeight = height;
            const latestBlock = blocks[0];
            const latestBlockNumber = latestBlock.number;

            if (prevHeight !== undefined && latestBlockNumber - prevHeight > 1) {
              // Missed multiple blocks, retrieve and emit individually.
              ignoreHeight = latestBlockNumber;
              const from = prevHeight + 1;
              const pageSize = latestBlockNumber - prevHeight;
              return getBlocksBase(adapter, pageSize, undefined, from).pipe(
                filter((latestBlocks) => latestBlocks.length > 0),
                switchMap((latestBlocks) => of(...latestBlocks.reverse())),
                tap(() => {
                  if (height && height < latestBlockNumber) {
                    height = latestBlockNumber;
                  }
                })
              );
            }
            height = latestBlockNumber;
            return of(latestBlock);
          }
          return of(undefined);
        }),
        catchError((e) => {
          console.error('[SubsquidAdapter] subscribeNewBlock', e);
          return throwError(() => new Error('[SubsquidAdapter] subscribeNewBlock: Latest block not found'));
        })
      )),
    filter((b): b is types.Block => isObject(b))
  );
  fn.identifiers = identifiers;
  return fn;
};
