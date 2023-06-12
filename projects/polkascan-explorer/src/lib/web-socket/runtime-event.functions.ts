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


import { Adapter } from '../polkascan-explorer';
import * as pst from '../polkascan-explorer.types';
import { types } from '@polkadapt/core';
import {
  createObjectObservable,
  createObjectsListObservable,
  generateObjectQuery,
  isNumber,
  isString
} from './helpers';
import { Observable } from 'rxjs';

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

const identifiers = ['specName', 'specVersion', 'pallet', 'eventName', 'palletEventIdx'];


export const getRuntimeEvent = (adapter: Adapter) => {
  const fn = (specName: string, specVersion: number, pallet: string, eventName: string): Observable<types.RuntimeEvent> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const filters: string[] = [];

    if (isString(specName) && isNumber(specVersion) && isString(pallet) && isString(eventName)) {
      filters.push(`specName: "${specName}"`);
      filters.push(`specVersion: ${specVersion}`);
      filters.push(`pallet: "${pallet}"`);
      filters.push(`eventName: "${eventName}"`);
    } else {
      throw new Error(
        '[PolkascanExplorerAdapter] getRuntimeEvent: ' +
        'Provide the specName (string), specVersion (number), pallet (string) and eventName (string).'
      );
    }

    const query = generateObjectQuery('getRuntimeEvent', runtimeEventFields, filters);
    return createObjectObservable<pst.RuntimeEvent>(adapter, 'getRuntimeEvent', query);
  };
  fn.identifiers = identifiers;
  return fn;
};


export const getRuntimeEvents = (adapter: Adapter) => {
  const fn = (
    specName: string, specVersion: number, pallet?: string): Observable<types.RuntimeEvent[]> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const filters: string[] = [];

    if (isString(specName) && isNumber(specVersion)) {
      filters.push(`specName: "${specName}"`);
      filters.push(`specVersion: ${specVersion}`);
      if (isString(pallet)) {
        filters.push(`pallet: "${pallet}"`);
      }
    } else {
      throw new Error(
        '[PolkascanExplorerAdapter] getRuntimeEvents: Provide the specName (string), specVersion (number) and optionally pallet (string).'
      );
    }

    return createObjectsListObservable<pst.RuntimeEvent>(adapter, 'getRuntimeEvents', runtimeEventFields, filters, identifiers);
  };
  fn.identifiers = identifiers;
  return fn;
};
