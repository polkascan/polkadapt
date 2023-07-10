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

const identifiers = ['specName', 'specVersion', 'pallet'];

export const getRuntimePallets = (adapter: Adapter) => {
  const fn = (specName: string, specVersion: number): Observable<types.RuntimePallet[]> =>
    getMetadataForSpecVersion(adapter, specName, specVersion).pipe(
      map(data => {
        const metadata = data[1];
        const runtimePallets: types.RuntimePallet[] = [];
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

