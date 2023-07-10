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

const runtimeStorageFields: (keyof pst.RuntimeStorage)[] = [
  'specName',
  'specVersion',
  'pallet',
  'storageName',
  'palletStorageIdx',
  'modifier',
  'keyPrefixPallet',
  'keyPrefixName',
  'key1ScaleType',
  'key1Hasher',
  'key2ScaleType',
  'key2Hasher',
  'valueScaleType',
  'isLinked',
  'documentation'
];

const identifiers = ['specName', 'specVersion', 'pallet', 'storageName'];


export const getRuntimeStorage = (adapter: Adapter) => {
  const fn = (specName: string, specVersion: number, pallet: string, storageName: string): Observable<types.RuntimeStorage> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const filters: string[] = [];

    if (isString(specName) && isNumber(specVersion) && isString(pallet) && isString(storageName)) {
      filters.push(`specName: "${specName}"`);
      filters.push(`specVersion: ${specVersion}`);
      filters.push(`pallet: "${pallet}"`);
      filters.push(`storageName: "${storageName}"`);
    } else {
      throw new Error(
        '[PolkascanExplorerAdapter] getRuntimeStorage: Provide the specName (string), specVersion (number), pallet (string) ' +
        'and storageName (string).'
      );
    }

    const query = generateObjectQuery('getRuntimeStorage', runtimeStorageFields, filters);
    return createObjectObservable<pst.RuntimeStorage>(adapter, 'getRuntimeStorage', query);
  };
  fn.identifiers = identifiers;
  return fn;
};


export const getRuntimeStorages = (adapter: Adapter) => {
  const fn = (specName: string, specVersion: number, pallet?: string): Observable<types.RuntimeStorage[]> => {
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
        '[PolkascanExplorerAdapter] getRuntimeStorages: Provide the specName (string), specVersion (number) and pallet (string).'
      );
    }

    return createObjectsListObservable<pst.RuntimeStorage>(adapter, 'getRuntimeStorages', runtimeStorageFields, filters, identifiers);
  };
  fn.identifiers = identifiers;
  return fn;
};

