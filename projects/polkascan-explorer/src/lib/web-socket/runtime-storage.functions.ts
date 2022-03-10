/*
 * PolkADAPT
 *
 * Copyright 2020-2022 Polkascan Foundation (NL)
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
import { generateObjectQuery, generateObjectsListQuery, isArray, isNumber, isObject, isString } from './helpers';

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

export const getRuntimeStorage = (adapter: Adapter) =>
  async (specName: string, specVersion: number, pallet: string, storageName: string): Promise<pst.RuntimeStorage> => {
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

    const result = await adapter.socket.query(query) as { getRuntimeStorage: pst.RuntimeStorage };
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const RuntimeStorage = result.getRuntimeStorage;
    if (isObject(RuntimeStorage)) {
      return RuntimeStorage;
    } else {
      throw new Error(`[PolkascanExplorerAdapter] getRuntimeStorage: Returned response is invalid.`);
    }
  };


export const getRuntimeStorages = (adapter: Adapter) =>
  async (specName: string, specVersion: number, pallet?: string): Promise<pst.ListResponse<pst.RuntimeStorage>> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const filters: string[] = [];

    if (isString(specName) && isNumber(specVersion)) {
      filters.push(`specName: "${specName}"`);
      filters.push(`specVersion: ${specVersion}`);
      if (isString(pallet)) {
        filters.push(`pallet: "${pallet as string}"`);
      }
    } else {
      throw new Error(
        '[PolkascanExplorerAdapter] getRuntimeStorages: Provide the specName (string), specVersion (number) and pallet (string).'
      );
    }

    const query = generateObjectsListQuery('getRuntimeStorages', runtimeStorageFields, filters);

    const result = await adapter.socket.query(query) as { getRuntimeStorages: pst.ListResponse<pst.RuntimeStorage> };
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const RuntimeStorages = result.getRuntimeStorages.objects;
    if (isArray(RuntimeStorages)) {
      return result.getRuntimeStorages;
    } else {
      throw new Error(`[PolkascanExplorerAdapter] getRuntimeStorages: Returned response is invalid.`);
    }
  };
