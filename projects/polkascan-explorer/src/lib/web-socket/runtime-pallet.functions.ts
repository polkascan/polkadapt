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

const runtimePalletFields: (keyof pst.RuntimePallet)[] = [
  'specName',
  'specVersion',
  'pallet',
  'prefix',
  'name',
  'countCallFunctions',
  'countStorageFunctions',
  'countEvents',
  'countConstants',
  'countErrors'
];

const identifiers = ['specName', 'specVersion', 'pallet'];


export const getRuntimePallet = (adapter: Adapter) => {
  const fn = (specName: string, specVersion: number, pallet: string): Observable<types.RuntimePallet> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const filters: string[] = [];

    if (isString(specName) && isNumber(specVersion) && isString(pallet)) {
      filters.push(`specName: "${specName}"`);
      filters.push(`specVersion: ${specVersion}`);
      filters.push(`pallet: "${pallet}"`);
    } else {
      throw new Error(
        '[PolkascanExplorerAdapter] getRuntimePallet: Provide the specName (string), specVersion (number) and pallet (string).'
      );
    }

    const query = generateObjectQuery('getRuntimePallet', runtimePalletFields, filters);
    return createObjectObservable<pst.RuntimePallet>(adapter, 'getRuntimePallet', query);
  };
  fn.identifiers = identifiers;
  return fn;
};

export const getRuntimePallets = (adapter: Adapter) => {
  const fn = (specName: string, specVersion: number): Observable<types.RuntimePallet[]> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const filters: string[] = [];

    if (isString(specName) && isNumber(specVersion)) {
      filters.push(`specName: "${specName}"`);
      filters.push(`specVersion: ${specVersion}`);
    } else {
      throw new Error(
        '[PolkascanExplorerAdapter] getRuntimePallets: Provide the specName (string) and specVersion (number).'
      );
    }

    return createObjectsListObservable<pst.RuntimePallet>(adapter, 'getRuntimePallets', runtimePalletFields, filters, identifiers);
  };
  fn.identifiers = identifiers;
  return fn;
};
