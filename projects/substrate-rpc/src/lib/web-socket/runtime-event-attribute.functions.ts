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

const identifiers = ['specName', 'specVersion', 'pallet', 'eventName', 'eventAttributeName'];

export const getRuntimeEventAttributes = (adapter: Adapter) => {
  const fn = (specName: string, specVersion: number, pallet: string, eventName: string): Observable<types.RuntimeEventAttribute[]> =>
    getMetadataForSpecVersion(adapter, specName, specVersion).pipe(
      map(data => {
        const metadata = data[1];
        const runtimeEventAttributes: types.RuntimeEventAttribute[] = [];
        const metadataTypes = metadata.asLatest.lookup.types.toArray();
        const registry = metadata.registry;
        let palletFound = false;
        let attributeFound = false;

        for (const p of metadata.asLatest.pallets) {
          if (pallet && p.name.toLowerCase() !== pallet.toLowerCase()) {
            continue;
          }

          palletFound = true;
          const eventsType = p.events.value.type ?
            metadataTypes[p.events.value.type.toNumber()].type : null;

          if (eventsType) {
            const events = eventsType.def.asVariant.variants;
            for (const e of events) {
              if (e.name.toLowerCase() === eventName.toLowerCase()) {
                attributeFound = true
                for (const a of e.fields.toArray()) {
                  runtimeEventAttributes.push({
                    specName,
                    specVersion,
                    pallet: p.name.toString(),
                    eventName: e.name.toString(),
                    eventAttributeName: a.name.toString(),
                    scaleType: a.typeName.toString(),
                    scaleTypeComposition: getSiName(registry.lookup, a.type)
                  });
                }
              }
            }
          }
        }
        if (!palletFound || !attributeFound) {
          throw new Error('Could not find runtime event attributes, pallet or attribute does not exist.');
        }
        return runtimeEventAttributes;
      })
    );
  fn.identifiers = identifiers;
  return fn;
};
