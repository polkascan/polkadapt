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

export const getRuntimePallet = (adapter: Adapter) => {
  return async (specName: string, specVersion: number, pallet: string): Promise<pst.RuntimePallet> => {
    const filters: string[] = [];

    if (isString(specName) && isNumber(specVersion) && isString(pallet)) {
      filters.push(`specName: "${specName}"`);
      filters.push(`specVersion: ${specVersion}`);
      filters.push(`pallet: "${pallet}"`);
    } else {
      throw new Error(
        '[PolkascanAdapter] getRuntimePallet: Provide the specName (string), specVersion (number) and pallet (string).'
      );
    }

    const query = generateObjectQuery('getRuntimePallet', runtimePalletFields, filters);

    const result = adapter.socket ? await adapter.socket.query(query) : {};
    const runtimePallet: pst.RuntimePallet = result.getRuntimePallet;
    if (isObject(runtimePallet)) {
      return runtimePallet;
    } else {
      throw new Error(`[PolkascanAdapter] getRuntimePallet: Returned response is invalid.`);
    }
  };
};


export const getRuntimePallets = (adapter: Adapter) => {
  return async (
    specName: string, specVersion: number, pageSize?: number, pageKey?: string
  ): Promise<pst.ListResponse<pst.RuntimePallet>> => {
    const filters: string[] = [];

    if (isString(specName) && isNumber(specVersion)) {
      filters.push(`specName: "${specName}"`);
      filters.push(`specVersion: ${specVersion}`);
    } else {
      throw new Error(
        '[PolkascanAdapter] getRuntimePallets: Provide the specName (string) and specVersion (number).'
      );
    }

    const query = generateObjectsListQuery('getRuntimePallets', runtimePalletFields, filters, pageSize, pageKey);

    const result = adapter.socket ? await adapter.socket.query(query) : {};
    const runtimePallets = result.getRuntimePallets.objects;
    if (isArray(runtimePallets)) {
      return result.getRuntimePallets;
    } else {
      throw new Error(`[PolkascanAdapter] getRuntimePallets: Returned response is invalid.`);
    }
  };
};
