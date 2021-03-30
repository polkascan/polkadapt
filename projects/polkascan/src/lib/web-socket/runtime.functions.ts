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
import {
  generateObjectQuery,
  generateObjectsListQuery,
  isArray,
  isDefined,
  isNumber,
  isObject, isString
} from './helpers';

const runtimeFields: (keyof pst.Runtime)[] = [
  'specName',
  'specVersion',
  'implName',
  'implVersion',
  'authoringVersion',
  'countCallFunctions',
  'countEvents',
  'countPallets',
  'countStorageFunctions',
  'countConstants',
  'countErrors'
];

export const getRuntime = (adapter: Adapter) => {
  return async (specName?: string, specVersion?: number): Promise<pst.Runtime> => {
    const filters: string[] = [];

    if (isString(specName) && isNumber(specVersion)) {
      filters.push(`specName: ${specName}`);
      filters.push(`specVersion: ${specVersion}`);
    } else if (isDefined(specVersion)) {
      throw new Error('[PolkascanAdapter] getRuntime: Provided attribute specVersion must be a number.');
    }

    const query = generateObjectQuery('getRuntime', runtimeFields, filters);

    const result = await adapter.socket.query(query);
    const runtime: pst.Runtime = result.getRuntime;
    if (isObject(runtime)) {
      return runtime;
    } else {
      throw new Error(`[PolkascanAdapter] getRuntime: Returned response is invalid.`);
    }
  };
};


export const getRuntimes = (adapter: Adapter) => {
  return async (pageSize?: number, pageKey?: string): Promise<pst.ListResponse<pst.Runtime>> => {
    const query = generateObjectsListQuery('getRuntimes', runtimeFields, [], pageSize, pageKey);

    const result = await adapter.socket.query(query);
    const runtimes = result.getRuntimes.objects;
    if (isArray(runtimes)) {
      return result.getRuntimes;
    } else {
      throw new Error(`[PolkascanAdapter] getRuntimes: Returned response is invalid.`);
    }
  };
};
