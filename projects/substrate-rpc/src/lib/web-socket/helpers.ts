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
import { from, Observable, switchMap } from 'rxjs';
import { Metadata } from '@polkadot/types';

export const getMetadataForSpecVersion = (adapter: Adapter, specName: string, specVersion: number): Observable<Metadata> =>
  from(adapter.apiPromise).pipe(
    switchMap(api =>
      api.rpc.chain.getHeader().pipe(
        switchMap(latestHeader => {
          const latestBlockNumber = latestHeader.number.toNumber();
          let left = 0;
          let right = latestBlockNumber;

          const binarySearch = (): Observable<Metadata> => {
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
                      return api.rpc.state.getMetadata(blockHash);
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
