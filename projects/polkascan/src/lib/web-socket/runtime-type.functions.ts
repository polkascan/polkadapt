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

const runtimeTypeFields: (keyof pst.RuntimeType)[] = [
  'specName',
  'specVersion',
  'pallet',
  'scaleType',
  'decoderClass',
  'isCorePrimitive',
  'isRuntimePrimitive',
];

export const getRuntimeType = (adapter: Adapter) => {
  return async (specName: string, specVersion: number, pallet: string, scaleType: string): Promise<pst.RuntimeType> => {
    const filters: string[] = [];

    if (isString(specName) && isNumber(specVersion) && isString(pallet) && isString(scaleType)) {
      filters.push(`specName: ${specName}`);
      filters.push(`specVersion: ${specVersion}`);
      filters.push(`pallet: ${pallet}`);
      filters.push(`scaleType: ${scaleType}`);
    } else {
      throw new Error(
        '[PolkascanAdapter] getRuntimeType: Provide the specName (string), specVersion (number), pallet (string) and scaleType (string).'
      );
    }

    const query = generateObjectQuery('getRuntimeType', runtimeTypeFields, filters);

    const result = await adapter.socket.query(query);
    const runtimeType: pst.RuntimeType = result.getRuntimeTypes;
    if (isObject(runtimeType)) {
      return runtimeType;
    } else {
      throw new Error(`[PolkascanAdapter] getRuntimeType: Returned response is invalid.`);
    }
  };
};


export const getRuntimeTypes = (adapter: Adapter) => {
  return async (specName: string, specVersion: number, pallet?: string,
                pageSize?: number, pageKey?: string): Promise<pst.ListResponse<pst.RuntimeType>> => {
    const filters: string[] = [];

    if (isString(specName) && isNumber(specVersion)) {
      filters.push(`specName: ${specName}`);
      filters.push(`specVersion: ${specVersion}`);
      if (isString(pallet)) {
        filters.push(`pallet: ${pallet}`);
      }
    } else {
      throw new Error(
        '[PolkascanAdapter] getRuntimeTypes: Provide the specName (string), specVersion (number) and pallet (string).'
      );
    }

    const query = generateObjectsListQuery('getRuntimeTypes', runtimeTypeFields, filters, pageSize, pageKey);

    const result = await adapter.socket.query(query);
    const runtimeTypes = result.getRuntimeTypes.objects;
    if (isArray(runtimeTypes)) {
      return result.getRuntimeTypes;
    } else {
      throw new Error(`[PolkascanAdapter] getRuntimeTypes: Returned response is invalid.`);
    }
  };
};
