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
import { from, map, switchMap, throwError } from 'rxjs';
import { capitalize, isPositiveNumber } from './helpers';
import { getBlockBase } from './block.functions';
import { GenericEvent } from '@polkadot/types';

const identifiers = ['blockNumber', 'eventIdx'];

export const getEvent = (adapter: Adapter) => {
  const fn = (blockNumber: number, eventIdx: number) => {

    if (!isPositiveNumber(blockNumber)) {
      return throwError(() => 'Provided block number must be a positive number.');
    }

    if (!isPositiveNumber(eventIdx)) {
      return throwError(() => 'Provided eventIdx must be a positive number.');
    }

    return from(adapter.apiPromise).pipe(
      switchMap(() => getBlockBase(adapter)(blockNumber)),
      map((block) => {
        if (block && block.events && block.events[eventIdx]) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const event: GenericEvent = block.events[eventIdx].event;
          if (event) {
            let attributes;
            let attributesMeta;

            if (event.data) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
              attributes = event.data.toJSON() as { [k: string]: any };
              attributesMeta = event.meta.toJSON() as { [k: string]: any };
            }

            let eventModule: string | null = null;
            let eventName: string | null = null;
            if (event.section) {
              eventModule = capitalize(event.section.toString());
            }
            if (event.method) {
              eventName = event.method.toString();
            }

            const result = {
              blockNumber: block.number,
              eventIdx: eventIdx,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
              extrinsicIdx: (block.events[eventIdx]?.phase?.value.toJSON() as number | null) || null,
              event: event.section && event.method &&
                `${event.section}.${event.method}`,
              eventModule: eventModule,
              eventName: eventName,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
              attributes: attributes,
              meta: attributesMeta,
              blockDatetime: block.datetime,
              blockHash: block.hash,
              specName: block.specName,
              specVersion: block.specVersion
            }
            return result;
          }
        }
        throw new Error(`[Substrate RPC Adapter] getEvent could find requested event.`)
      })
    )
  }
  fn.identifiers = identifiers;
  return fn;

}
