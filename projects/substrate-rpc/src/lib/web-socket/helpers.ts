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

import { Adapter } from '../substrate-rpc';
import { combineLatest, from, Observable, of, switchMap, tap } from 'rxjs';
import { Metadata } from '@polkadot/types';
import { RuntimeVersion } from '@polkadot/types/interfaces';

type MetadataCache = {
  [specName: string]: {
    [specVersion: string]: [RuntimeVersion, Metadata];
  };
};

const metadataCache: MetadataCache = {};

export const getMetadataForSpecVersion =
  (adapter: Adapter, specName: string, specVersion: number): Observable<[RuntimeVersion, Metadata]> =>
    (metadataCache[specName] && metadataCache[specName][specVersion])
      ? of(metadataCache[specName][specVersion])
      : from(adapter.apiPromise).pipe(
        switchMap(api =>
          api.rpc.chain.getHeader().pipe(
            switchMap(latestHeader => {
              const latestBlockNumber = latestHeader.number.toNumber();
              let left = 0;
              let right = latestBlockNumber;

              const binarySearch = (): Observable<[RuntimeVersion, Metadata]> => {
                if (left > right) {
                  throw new Error('Spec version not found');
                }
                const mid = Math.floor((left + right) / 2);

                return api.rpc.chain.getBlockHash(mid).pipe(
                  switchMap(blockHash =>
                    api.rpc.state.getRuntimeVersion(blockHash).pipe(
                      switchMap(runtimeVersion => {
                        if (runtimeVersion.specName.toString() !== specName || runtimeVersion.specVersion.toNumber() < specVersion) {
                          left = mid + 1;
                          return binarySearch();
                        } else if (runtimeVersion.specName.toString() === specName && runtimeVersion.specVersion.toNumber() > specVersion) {
                          right = mid - 1;
                          return binarySearch();
                        } else {
                          if (!metadataCache[specName]) {
                            metadataCache[specName] = {};
                          }
                          return combineLatest([
                            of(runtimeVersion),
                            api.rpc.state.getMetadata(blockHash).pipe(tap(metadata => {
                              metadataCache[specName][specVersion] = [runtimeVersion, metadata];
                            }))
                          ]);
                        }
                      })
                    )
                  )
                );
              };

              return binarySearch();
            })
          )
        )
      );


export const isDefined = <T>(val: T | undefined | null): val is T => val !== null && val !== undefined;

export const isPositiveNumber = (val: unknown): val is number => Number.isInteger(val) && (val as number) >= 0;

export const camelToSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

export const capitalize = (str: string) => str[0].toUpperCase() + str.slice(1);
