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

const identifiers = ['specName', 'specVersion', 'pallet', 'eventName', 'palletEventIdx'];

export const getRuntimeEvents = (adapter: Adapter) => {
  const fn = (specName: string, specVersion: number, pallet?: string): Observable<types.RuntimeEvent[]> =>
    getMetadataForSpecVersion(adapter, specName, specVersion).pipe(
      map(data => {
        const metadata = data[1];
        const runtimeEvents: types.RuntimeEvent[] = [];
        const metadataTypes = metadata.asLatest.lookup.types.toArray();
        for (const p of metadata.asLatest.pallets) {
          if (pallet && p.name.toString() !== pallet) {
            continue;
          }
          const eventsType = p.events.value.type ?
            metadataTypes[p.events.value.type.toNumber()].type : null;
          if (eventsType) {
            const events = eventsType.def.asVariant.variants;
            for (const e of events) {
              runtimeEvents.push({
                specName,
                specVersion,
                pallet: p.name.toString(),
                eventName: e.name.toString(),
                lookup: e.index.toString(),
                countAttributes: e.fields.length,
                documentation: e.docs.toArray().map(d => d.toString()).join('\n'),
                palletEventIdx: e.index.toNumber()
              });
            }
          }
        }
        runtimeEvents.sort((a, b) =>
          a.pallet.localeCompare(b.pallet) || a.eventName && b.eventName && a.eventName.localeCompare(b.eventName) || 0
        );
        return runtimeEvents;
      })
    );
  fn.identifiers = identifiers;
  return fn;
};

export const getRuntimeEvent = (adapter: Adapter) => {
  const fn = (specName: string, specVersion: number, pallet: string, eventName: string): Observable<types.RuntimeEvent> =>
    getRuntimeEvents(adapter)(specName, specVersion, pallet).pipe(
      map(events => {
        const runtimeEvent = events.find(e => e.eventName === eventName);
        if (!runtimeEvent) {
          throw new Error('Event not found');
        }
        return runtimeEvent;
      })
    );
  fn.identifiers = identifiers;
  return fn;
};

