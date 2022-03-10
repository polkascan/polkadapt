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

const runtimeTypeFields: (keyof pst.RuntimeType)[] = [
  'specName',
  'specVersion',
  'scaleType',
  'decoderClass',
  'isCorePrimitive',
  'isRuntimePrimitive',
];

export const getRuntimeType = (adapter: Adapter) =>
  async (specName: string, specVersion: number, scaleType: string): Promise<pst.RuntimeType> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const filters: string[] = [];

    if (isString(specName) && isNumber(specVersion) && isString(scaleType)) {
      filters.push(`specName: "${specName}"`);
      filters.push(`specVersion: ${specVersion}`);
      filters.push(`scaleType: "${scaleType}"`);
    } else {
      throw new Error(
        '[PolkascanExplorerAdapter] getRuntimeType: Provide the specName (string), specVersion (number) and scaleType (string).'
      );
    }

    const query = generateObjectQuery('getRuntimeType', runtimeTypeFields, filters);

    const result = await adapter.socket.query(query) as { getRuntimeType: pst.RuntimeType };
    const runtimeType = result.getRuntimeType;
    if (isObject(runtimeType)) {
      return runtimeType;
    } else {
      throw new Error(`[PolkascanExplorerAdapter] getRuntimeType: Returned response is invalid.`);
    }
  };


export const getRuntimeTypes = (adapter: Adapter) =>
  async (specName: string, specVersion: number): Promise<pst.ListResponse<pst.RuntimeType>> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const filters: string[] = [];

    if (isString(specName) && isNumber(specVersion)) {
      filters.push(`specName: "${specName}"`);
      filters.push(`specVersion: ${specVersion}`);
    } else {
      throw new Error(
        '[PolkascanExplorerAdapter] getRuntimeTypes: Provide the specName (string) and specVersion (number).'
      );
    }

    const query = generateObjectsListQuery('getRuntimeTypes', runtimeTypeFields, filters);

    const result = await adapter.socket.query(query) as { getRuntimeTypes: pst.ListResponse<pst.RuntimeType> };
    const runtimeTypes = result.getRuntimeTypes.objects;
    if (isArray(runtimeTypes)) {
      return result.getRuntimeTypes;
    } else {
      throw new Error(`[PolkascanExplorerAdapter] getRuntimeTypes: Returned response is invalid.`);
    }
  };
