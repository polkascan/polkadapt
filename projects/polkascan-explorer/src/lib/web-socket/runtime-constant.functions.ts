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


export const getRuntimeConstant = (adapter: Adapter) =>
  async (specName: string, specVersion: number, pallet: string, constantName: string): Promise<pst.RuntimeConstant> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const filters: string[] = [];

    if (isString(specName) && isNumber(specVersion) && isString(pallet) && isString(constantName)) {
      filters.push(`specName: "${specName}"`);
      filters.push(`specVersion: ${specVersion}`);
      filters.push(`pallet: "${pallet}"`);
      filters.push(`constantName: "${constantName}"`);
    } else {
      throw new Error(
        '[PolkascanExplorerAdapter] getRuntimeConstant: ' +
        'Provide the specName (string), specVersion (number), pallet (string) and constantName (string).'
      );
    }

    const query = generateObjectQuery('getRuntimeConstant', runtimeConstantFields, filters);

    const result = await adapter.socket.query(query) as { getRuntimeConstant: pst.RuntimeConstant };
    const runtimeConstant = result.getRuntimeConstant;
    if (isObject(runtimeConstant)) {
      return runtimeConstant;
    } else {
      throw new Error(`[PolkascanExplorerAdapter] getRuntimeConstant: Returned response is invalid.`);
    }
  };


export const getRuntimeConstants = (adapter: Adapter) =>
  async (
    specName: string, specVersion: number, pallet?: string): Promise<pst.ListResponse<pst.RuntimeConstant>> => {
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
        '[PolkascanExplorerAdapter] getRuntimeConstants: ' +
        'Provide the specName (string), specVersion (number) and optionally pallet (string).'
      );
    }

    const query = generateObjectsListQuery('getRuntimeConstants', runtimeConstantFields, filters);

    const result = await adapter.socket.query(query) as {getRuntimeConstants: pst.ListResponse<pst.RuntimeConstant>};
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const RuntimeConstants = result.getRuntimeConstants.objects;
    if (isArray(RuntimeConstants)) {
      return result.getRuntimeConstants;
    } else {
      throw new Error(`[PolkascanExplorerAdapter] getRuntimeConstants: Returned response is invalid.`);
    }
  };
