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
import { getSiName } from '@polkadot/types/metadata/util';

const identifiers = ['specName', 'specVersion', 'pallet', 'callName', 'callArgumentIdx'];

export const getRuntimeCallArguments = (adapter: Adapter) => {
  const fn = (specName: string, specVersion: number, pallet: string, callName: string): Observable<types.RuntimeCallArgument[]> =>
    getMetadataForSpecVersion(adapter, specName, specVersion).pipe(
      map(data => {
        const metadata = data[1];
        const runtimeCallsArguments: types.RuntimeCallArgument[] = [];
        const metadataTypes = metadata.asLatest.lookup.types.toArray();
        const registry = metadata.registry;
        let palletFound = false;
        let callFound = false;

        for (const p of metadata.asLatest.pallets) {
          if (pallet && p.name.toString() !== pallet) {
            continue;
          }

          palletFound = true;
          const callsType = p.calls.value.type ?
            metadataTypes[p.calls.value.type.toNumber()].type : null;

          if (callsType) {
            const calls = callsType.def.asVariant.variants;
            for (const c of calls) {
              if (c.name.toString() === callName) {
                callFound = true;
                c.fields.forEach((f, i) => {
                  runtimeCallsArguments.push({
                    specName,
                    specVersion,
                    pallet: p.name.toString(),
                    callName: c.name.toString(),
                    callArgumentIdx: i,
                    name: f.name.toString(),
                    scaleType: f.typeName.toString(),
                    scaleTypeComposition: getSiName(registry.lookup, f.type)
                  });
                });
              }
            }
          }
        }
        runtimeCallsArguments.sort((a, b) =>
          a.pallet.localeCompare(b.pallet)
          || a.callName.localeCompare(b.callName)
          || a.callArgumentIdx - b.callArgumentIdx);

        if (!palletFound || !callFound) {
          throw new Error('Could not find runtime call arguments, pallet or call does not exist.');
        }

        return runtimeCallsArguments;
      })
    );
  fn.identifiers = identifiers;
  return fn;
};
