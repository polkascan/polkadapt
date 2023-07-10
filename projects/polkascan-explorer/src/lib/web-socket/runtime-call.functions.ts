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
  createObjectObservable, createObjectsListObservable,
  generateObjectQuery,
  isNumber,
  isString
} from './helpers';
import { Observable } from 'rxjs';

const runtimeCallFields: (keyof pst.RuntimeCall)[] = [
  'specName',
  'specVersion',
  'pallet',
  'callName',
  'palletCallIdx',
  'lookup',
  'documentation',
  'countArguments'
];

const identifiers = ['specName', 'specVersion', 'pallet', 'callName', 'palletCallIdx'];


export const getRuntimeCall = (adapter: Adapter) => {
  const fn = (specName: string, specVersion: number, pallet: string, callName: string): Observable<types.RuntimeCall> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const filters: string[] = [];

    if (isString(specName) && isNumber(specVersion) && isString(pallet) && isString(callName)) {
      filters.push(`specName: "${specName}"`);
      filters.push(`specVersion: ${specVersion}`);
      filters.push(`pallet: "${pallet}"`);
      filters.push(`callName: "${callName}"`);
    } else {
      throw new Error(
        '[PolkascanExplorerAdapter] getRuntimeCall: ' +
        'Provide the specName (string), specVersion (number), pallet (string) and callName (string).'
      );
    }

    const query = generateObjectQuery('getRuntimeCall', runtimeCallFields, filters);
    return createObjectObservable<pst.RuntimeCall>(adapter, 'getRuntimeCall', query);
  };
  fn.identifiers = identifiers;
  return fn;
};

export const getRuntimeCalls = (adapter: Adapter) => {
  const fn = (specName: string, specVersion: number, pallet?: string): Observable<types.RuntimeCall[]> => {
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
        '[PolkascanExplorerAdapter] getRuntimeCalls: Provide the specName (string), specVersion (number) and pallet (string).'
      );
    }

    return createObjectsListObservable<pst.RuntimeCall>(adapter, 'getRuntimeCalls', runtimeCallFields, filters, identifiers);
  };
  fn.identifiers = identifiers;
  return fn;
};
