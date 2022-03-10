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
import { generateObjectsListQuery, isArray, isNumber, isString } from './helpers';

const runtimeCallArgumentFields: (keyof pst.RuntimeCallArgument)[] = [
  'specName',
  'specVersion',
  'pallet',
  'callName',
  'callArgumentIdx',
  'name',
  'scaleType'
];


export const getRuntimeCallArguments = (adapter: Adapter) =>
  async (specName: string, specVersion: number, pallet: string, callName: string): Promise<pst.ListResponse<pst.RuntimeCallArgument>> => {
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
        '[PolkascanExplorerAdapter] getRuntimeCallArguments: ' +
        'Provide the specName (string), specVersion (number), pallet (string) and callName (string).'
      );
    }

    const query = generateObjectsListQuery('getRuntimeCallArguments', runtimeCallArgumentFields, filters);
    const result = await adapter.socket.query(query) as { getRuntimeCallArguments: pst.ListResponse<pst.RuntimeCallArgument> };
    const runtimeCallArguments = result.getRuntimeCallArguments.objects;
    if (isArray(runtimeCallArguments)) {
      return result.getRuntimeCallArguments;
    } else {
      throw new Error(`[PolkascanExplorerAdapter] getRuntimeCallArguments: Returned response is invalid.`);
    }
  };
