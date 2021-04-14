/*
 * PolkADAPT
 *
 * Copyright 2020 Stichting Polkascan (Polkascan Foundation)
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


import { Adapter } from '../polkascan';
import * as pst from '../polkascan.types';
import { generateObjectQuery, generateObjectsListQuery, isArray, isNumber, isObject, isString } from './helpers';

const runtimeEventFields: (keyof pst.RuntimeEvent)[] = [
  'specName',
  'specVersion',
  'pallet',
  'eventName',
  'palletEventIdx',
  'lookup',
  'documentation',
  'countAttributes'
];

export const getRuntimeEvent = (adapter: Adapter) => {
  return async (specName: string, specVersion: number, pallet: string, eventName: string): Promise<pst.RuntimeEvent> => {
    const filters: string[] = [];

    if (isString(specName) && isNumber(specVersion) && isString(pallet) && isString(eventName)) {
      filters.push(`specName: ${specName}`);
      filters.push(`specVersion: ${specVersion}`);
      filters.push(`pallet: ${pallet}`);
      filters.push(`eventName: ${eventName}`);
    } else {
      throw new Error(
        '[PolkascanAdapter] getRuntimeEvent: Provide the specName (string), specVersion (number), pallet (string) and eventName (string).'
      );
    }

    const query = generateObjectQuery('getRuntimeEvent', runtimeEventFields, filters);

    const result = await adapter.socket.query(query);
    const runtimeEvent: pst.RuntimeEvent = result.getRuntimeEvent;
    if (isObject(runtimeEvent)) {
      return runtimeEvent;
    } else {
      throw new Error(`[PolkascanAdapter] getRuntimeEvent: Returned response is invalid.`);
    }
  };
};


export const getRuntimeEvents = (adapter: Adapter) => {
  return async (
    specName: string, specVersion: number, pallet: string, pageSize?: number, pageKey?: string
  ): Promise<pst.ListResponse<pst.RuntimeEvent>> => {
    const filters: string[] = [];

    if (isString(specName) && isNumber(specVersion) && isString(pallet)) {
      filters.push(`specName: ${specName}`);
      filters.push(`specVersion: ${specVersion}`);
      filters.push(`pallet: ${pallet}`);
    } else {
      throw new Error(
        '[PolkascanAdapter] getRuntimeEvents: Provide the specName (string), specVersion (number) and pallet (string).'
      );
    }

    const query = generateObjectsListQuery('getRuntimeEvents', runtimeEventFields, filters, pageSize, pageKey);

    const result = await adapter.socket.query(query);
    const RuntimeEvents = result.getRuntimeEvents.objects;
    if (isArray(RuntimeEvents)) {
      return result.getRuntimeEvents;
    } else {
      throw new Error(`[PolkascanAdapter] getRuntimeEvents: Returned response is invalid.`);
    }
  };
};
