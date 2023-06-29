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
import { from, map, Observable, switchMap } from 'rxjs';
import { Adapter } from '../substrate-rpc';
import { Metadata } from '@polkadot/types';
import { RuntimePallet } from '../substrate-rpc.types';
import { PalletEventMetadataLatest, PortableType } from '@polkadot/types/interfaces';

const identifiers = ['specName', 'specVersion', 'pallet'];

const getMetadataForSpecVersion = (adapter: Adapter, specName: string, specVersion: number): Observable<Metadata> =>
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

export const getRuntimePallets = (adapter: Adapter) => {
  const fn = (specName: string, specVersion: number): Observable<types.RuntimePallet[]> =>
    getMetadataForSpecVersion(adapter, specName, specVersion).pipe(
      map(metadata => {
        const runtimePallets: RuntimePallet[] = [];
        const metadataTypes = metadata.asLatest.lookup.types.toArray();
        for (const p of metadata.asLatest.pallets) {
          const calls = p.calls.value.type ?
            metadataTypes[p.calls.value.type.toNumber()].type.def.asVariant.variants.length : 0;
          const events = p.events.value.type ?
            metadataTypes[p.events.value.type.toNumber()].type.def.asVariant.variants.length : 0;
          const errors = p.errors.value.type ?
            metadataTypes[p.errors.value.type.toNumber()].type.def.asVariant.variants.length : 0;
          runtimePallets.push({
            specName,
            specVersion,
            pallet: p.name.toString(),
            prefix: p.name.toString(),
            name: p.name.toString(),
            countCallFunctions: calls,
            countStorageFunctions: p.storage.value.items?.length || 0,
            countEvents: events,
            countConstants: p.constants.length,
            countErrors: errors
          });
        }
        runtimePallets.sort((a, b) => a.pallet.localeCompare(b.pallet));
        return runtimePallets;
      })
    );
  fn.identifiers = identifiers;
  return fn;
};

export const getRuntimePallet = (adapter: Adapter) => {
  const fn = (specName: string, specVersion: number, pallet: string): Observable<types.RuntimePallet> =>
    getRuntimePallets(adapter)(specName, specVersion).pipe(
      map(pallets => {
        const runtimePallet = pallets.find(p => p.name === pallet);
        if (!runtimePallet) {
          throw new Error('Pallet not found');
        }
        return runtimePallet;
      })
    );
  fn.identifiers = identifiers;
  return fn;
};

