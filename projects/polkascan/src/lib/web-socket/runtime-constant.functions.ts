/*
 * PolkADAPT
 *
 * Copyright 2020-2021 Polkascan Foundation (NL)
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

const runtimeConstantFields: (keyof pst.RuntimeConstant)[] = [
  'specName',
  'specVersion',
  'pallet',
  'constantName',
  'palletConstantIdx',
  'scaleType',
  'value',
  'documentation'
];

export const getRuntimeConstant = (adapter: Adapter) => {
  return async (specName: string, specVersion: number, pallet: string, constantName: string): Promise<pst.RuntimeConstant> => {
    const filters: string[] = [];

    if (isString(specName) && isNumber(specVersion) && isString(pallet) && isString(constantName)) {
      filters.push(`specName: "${specName}"`);
      filters.push(`specVersion: ${specVersion}`);
      filters.push(`pallet: "${pallet}"`);
      filters.push(`constantName: "${constantName}"`);
    } else {
      throw new Error(
        '[PolkascanAdapter] getRuntimeConstant: Provide the specName (string), specVersion (number), pallet (string) and constantName (string).'
      );
    }

    const query = generateObjectQuery('getRuntimeConstant', runtimeConstantFields, filters);

    const result = adapter.socket ? await adapter.socket.query(query) : {};
    const runtimeConstant: pst.RuntimeConstant = result.getRuntimeConstant;
    if (isObject(runtimeConstant)) {
      return runtimeConstant;
    } else {
      throw new Error(`[PolkascanAdapter] getRuntimeConstant: Returned response is invalid.`);
    }
  };
};


export const getRuntimeConstants = (adapter: Adapter) => {
  return async (
    specName: string, specVersion: number, pallet?: string): Promise<pst.ListResponse<pst.RuntimeConstant>> => {
    const filters: string[] = [];

    if (isString(specName) && isNumber(specVersion)) {
      filters.push(`specName: "${specName}"`);
      filters.push(`specVersion: ${specVersion}`);
      if (isString(pallet)) {
        filters.push(`pallet: "${pallet}"`);
      }
    } else {
      throw new Error(
        '[PolkascanAdapter] getRuntimeConstants: Provide the specName (string), specVersion (number) and optionally pallet (string).'
      );
    }

    const query = generateObjectsListQuery('getRuntimeConstants', runtimeConstantFields, filters);

    const result = adapter.socket ? await adapter.socket.query(query) : {};
    const RuntimeConstants = result.getRuntimeConstants.objects;
    if (isArray(RuntimeConstants)) {
      return result.getRuntimeConstants;
    } else {
      throw new Error(`[PolkascanAdapter] getRuntimeConstants: Returned response is invalid.`);
    }
  };
};
