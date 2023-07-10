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

const identifiers = ['specName', 'specVersion', 'pallet', 'callName', 'palletCallIdx'];

export const getRuntimeCalls = (adapter: Adapter) => {
  const fn = (specName: string, specVersion: number, pallet?: string): Observable<types.RuntimeCall[]> =>
    getMetadataForSpecVersion(adapter, specName, specVersion).pipe(
      map(data => {
        const metadata = data[1];
        const runtimeCalls: types.RuntimeCall[] = [];
        const metadataTypes = metadata.asLatest.lookup.types.toArray();
        for (const p of metadata.asLatest.pallets) {
          if (pallet && p.name.toString() !== pallet) {
            continue;
          }
          const callsType = p.calls.value.type ?
            metadataTypes[p.calls.value.type.toNumber()].type : null;
          if (callsType) {
            const calls = callsType.def.asVariant.variants;
            for (const c of calls) {
              runtimeCalls.push({
                specName,
                specVersion,
                pallet: p.name.toString(),
                callName: c.name.toString(),
                lookup: c.index.toString(),
                countArguments: c.fields.length,
                documentation: c.docs.toArray().map(d => d.toString()).join('\n'),
                palletCallIdx: c.index.toNumber()
              });
            }
          }
        }
        runtimeCalls.sort((a, b) => a.pallet.localeCompare(b.pallet) || a.callName.localeCompare(b.callName));
        return runtimeCalls;
      })
    );
  fn.identifiers = identifiers;
  return fn;
};

export const getRuntimeCall = (adapter: Adapter) => {
  const fn = (specName: string, specVersion: number, pallet: string, callName: string): Observable<types.RuntimeCall> =>
    getRuntimeCalls(adapter)(specName, specVersion, pallet).pipe(
      map(calls => {
        const runtimeCall = calls.find(c => c.callName === callName);
        if (!runtimeCall) {
          throw new Error('Call not found');
        }
        return runtimeCall;
      })
    );
  fn.identifiers = identifiers;
  return fn;
};

