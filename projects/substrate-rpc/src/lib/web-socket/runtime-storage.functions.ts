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
import { map, Observable } from 'rxjs';
import { Adapter } from '../substrate-rpc';
import { getMetadataForSpecVersion } from './helpers';

const identifiers = ['specName', 'specVersion', 'pallet', 'storageName'];

export const getRuntimeStorages = (adapter: Adapter) => {
  const fn = (specName: string, specVersion: number, pallet?: string): Observable<types.RuntimeStorage[]> =>
    getMetadataForSpecVersion(adapter, specName, specVersion).pipe(
      map(data => {
        const metadata = data[1];
        const runtimeStorages: types.RuntimeStorage[] = [];
        for (const p of metadata.asLatest.pallets) {
          if (pallet && p.name.toString() !== pallet) {
            continue;
          }
          const storages = p.storage.value.items;
          if (storages) {
            for (const s of storages) {
              runtimeStorages.push({
                specName,
                specVersion,
                pallet: p.name.toString(),
                storageName: s.name.toString(),
                modifier: s.modifier.type,
                valueScaleType: s.type.isMap ? s.type.asMap.value.toString() : undefined,
                documentation: s.docs.toArray().map(d => d.toString()).join('\n')
              });
            }
          }
        }
        runtimeStorages.sort((a, b) => a.pallet.localeCompare(b.pallet) || a.storageName.localeCompare(b.storageName));
        return runtimeStorages;
      })
    );
  fn.identifiers = identifiers;
  return fn;
};

export const getRuntimeStorage = (adapter: Adapter) => {
  const fn = (specName: string, specVersion: number, pallet: string, storageName: string): Observable<types.RuntimeStorage> =>
    getRuntimeStorages(adapter)(specName, specVersion, pallet).pipe(
      map(storages => {
        const runtimeStorage = storages.find(s => s.storageName === storageName);
        if (!runtimeStorage) {
          throw new Error('Storage not found');
        }
        return runtimeStorage;
      })
    );
  fn.identifiers = identifiers;
  return fn;
};

