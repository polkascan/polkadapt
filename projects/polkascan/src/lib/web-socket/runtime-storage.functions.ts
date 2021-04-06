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

const runtimeStorageFields: (keyof pst.RuntimeStorage)[] = [
  'specName',
  'specVersion',
  'pallet',
  'storageName',
  'palletStorageIdx',
  'default',
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

export const getRuntimeStorage = (adapter: Adapter) => {
  return async (specName: string, specVersion: number, pallet: string, storageName: string): Promise<pst.RuntimeStorage> => {
    const filters: string[] = [];

    if (isString(specName) && isNumber(specVersion) && isString(pallet) && isString(storageName)) {
      filters.push(`specName: ${specName}`);
      filters.push(`specVersion: ${specVersion}`);
      filters.push(`pallet: ${pallet}`);
      filters.push(`storageName: ${storageName}`);
    } else {
      throw new Error(
        '[PolkascanAdapter] getRuntimeStorage: Provide the specName (string), specVersion (number), pallet (string) and storageName (string).'
      );
    }

    const query = generateObjectQuery('getRuntimeStorage', runtimeStorageFields, filters);

    const result = await adapter.socket.query(query);
    const RuntimeStorage: pst.RuntimeStorage = result.getRuntimeStorages;
    if (isObject(RuntimeStorage)) {
      return RuntimeStorage;
    } else {
      throw new Error(`[PolkascanAdapter] getRuntimeStorage: Returned response is invalid.`);
    }
  };
};


export const getRuntimeStorages = (adapter: Adapter) => {
  return async (specName: string, specVersion: number, pallet: string,
                pageSize?: number, pageKey?: string): Promise<pst.ListResponse<pst.RuntimeStorage>> => {
    const filters: string[] = [];

    if (isString(specName) && isNumber(specVersion) && isString(pallet)) {
      filters.push(`specName: ${specName}`);
      filters.push(`specVersion: ${specVersion}`);
      filters.push(`pallet: ${pallet}`);
    } else {
      throw new Error(
        '[PolkascanAdapter] getRuntimeStorages: Provide the specName (string), specVersion (number) and pallet (string).'
      );
    }

    const query = generateObjectsListQuery('getRuntimeStorages', runtimeStorageFields, filters, pageSize, pageKey);

    const result = await adapter.socket.query(query);
    const RuntimeStorages = result.getRuntimeStorages.objects;
    if (isArray(RuntimeStorages)) {
      return result.getRuntimeStorages;
    } else {
      throw new Error(`[PolkascanAdapter] getRuntimeStorages: Returned response is invalid.`);
    }
  };
};
