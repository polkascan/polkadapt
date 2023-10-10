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
import { getMetadataForSpecVersion } from './helpers';
import { ApiRx } from '@polkadot/api';

const identifiers = ['specName', 'specVersion'];

export const getRuntime = (adapter: Adapter) => {
  const fn = (specName: string, specVersion: number): Observable<types.Runtime> =>
    getMetadataForSpecVersion(adapter, specName, specVersion).pipe(
      map(([runtimeVersion, metadata]) => {
        const runtime: types.Runtime = {
          specName,
          specVersion,
          implName: runtimeVersion.implName.toString(),
          implVersion: runtimeVersion.implVersion.toNumber(),
          authoringVersion: runtimeVersion.authoringVersion.toBn().toNumber(),
          countCallFunctions: 0,
          countEvents: 0,
          countPallets: 0,
          countStorageFunctions: 0,
          countConstants: 0,
          countErrors: 0
        };
        const metadataTypes = metadata.asLatest.lookup.types.toArray();
        for (const p of metadata.asLatest.pallets) {
          const calls = p.calls.value.type ?
            metadataTypes[p.calls.value.type.toNumber()].type.def.asVariant.variants.length : 0;
          const events = p.events.value.type ?
            metadataTypes[p.events.value.type.toNumber()].type.def.asVariant.variants.length : 0;
          const errors = p.errors.value.type ?
            metadataTypes[p.errors.value.type.toNumber()].type.def.asVariant.variants.length : 0;
          runtime.countPallets += 1;
          runtime.countCallFunctions += calls;
          runtime.countEvents += events;
          runtime.countErrors += errors;
          runtime.countStorageFunctions += p.storage.value.items?.length || 0;
          runtime.countConstants += p.constants.length;
        }
        return runtime;
      })
    );
  fn.identifiers = identifiers;
  return fn;
};

export const getLatestRuntime = (adapter: Adapter) => {
  const fn = (): Observable<types.Runtime> =>
    from(adapter.apiPromise).pipe(
      switchMap((api: ApiRx) => {
          const version = (api.consts.system.version).toJSON() as {specName: string, specVersion: number};
          return getRuntime(adapter)(version.specName, version.specVersion)
        }
      )
    )
  fn.identifiers = identifiers;
  return fn;
}
