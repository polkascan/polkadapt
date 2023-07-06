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

const identifiers = ['specName', 'specVersion', 'pallet', 'constantName', 'palletConstantIdx'];

export const getRuntimeConstants = (adapter: Adapter) => {
  const fn = (specName: string, specVersion: number, pallet?: string): Observable<types.RuntimeConstant[]> =>
    getMetadataForSpecVersion(adapter, specName, specVersion).pipe(
      map(data => {
        const metadata = data[1];
        const runtimeConstants: types.RuntimeConstant[] = [];
        const registry = metadata.registry;

        for (const p of metadata.asLatest.pallets) {
          if (pallet && p.name.toString() !== pallet) {
            continue;
          }
          p.constants.forEach((c, i) => {
            const value = registry.createType(getSiName(registry.lookup, c.type), c.value.toU8a(true));
            runtimeConstants.push({
              specName,
              specVersion,
              pallet: p.name.toString(),
              constantName: c.name.toString(),
              palletConstantIdx: i,
              scaleType: c.type.toString(),
              scaleTypeComposition: JSON.stringify(getSiName(registry.lookup, c.type)),
              value: value.toString(),
              documentation: c.docs.join('')
            });
          });
        }

        runtimeConstants.sort((a, b) => a.pallet.localeCompare(b.pallet) || a.constantName.localeCompare(b.constantName));
        return runtimeConstants;
      })
    );
  fn.identifiers = identifiers;
  return fn;
};

export const getRuntimeConstant = (adapter: Adapter) => {
  const fn = (specName: string, specVersion: number, pallet: string, constantName: string): Observable<types.RuntimeConstant> =>
    getRuntimeConstants(adapter)(specName, specVersion, pallet).pipe(
      map(constants => {
        const runtimeConstant = constants.find(p => p.constantName === constantName);
        if (!runtimeConstant) {
          throw new Error('Constant not found');
        }
        return runtimeConstant;
      })
    );
  fn.identifiers = identifiers;
  return fn;
};

