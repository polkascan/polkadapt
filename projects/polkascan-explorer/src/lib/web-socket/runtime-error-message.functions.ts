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

const runtimeErrorMessageFields: (keyof pst.RuntimeErrorMessage)[] = [
  'specName',
  'specVersion',
  'pallet',
  'errorName',
  'palletIdx',
  'errorIdx',
  'documentation'
];

export const getRuntimeErrorMessage = (adapter: Adapter) =>
  async (specName: string, specVersion: number, pallet: string, errorName: string): Promise<pst.RuntimeErrorMessage> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const filters: string[] = [];

    if (isString(specName) && isNumber(specVersion) && isString(pallet) && isString(errorName)) {
      filters.push(`specName: "${specName}"`);
      filters.push(`specVersion: ${specVersion}`);
      filters.push(`pallet: "${pallet}"`);
      filters.push(`errorName: "${errorName}"`);
    } else {
      throw new Error(
        '[PolkascanExplorerAdapter] getRuntimeErrorMessage: Provide the specName (string), specVersion (number), pallet (string) ' +
        'and errorName (string).'
      );
    }

    const query = generateObjectQuery('getRuntimeErrorMessage', runtimeErrorMessageFields, filters);

    const result = await adapter.socket.query(query) as { getRuntimeErrorMessage: pst.RuntimeErrorMessage };
    const runtimeErrorMessage = result.getRuntimeErrorMessage;
    if (isObject(runtimeErrorMessage)) {
      return runtimeErrorMessage;
    } else {
      throw new Error(`[PolkascanExplorerAdapter] getRuntimeErrorMessage: Returned response is invalid.`);
    }
  };


export const getRuntimeErrorMessages = (adapter: Adapter) =>
  async (
    specName: string, specVersion: number, pallet?: string): Promise<pst.ListResponse<pst.RuntimeErrorMessage>> => {
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
        '[PolkascanExplorerAdapter] getRuntimeErrorMessages: ' +
        'Provide the specName (string), specVersion (number) and optionally pallet (string).'
      );
    }

    const query = generateObjectsListQuery('getRuntimeErrorMessages', runtimeErrorMessageFields, filters);

    const result = await adapter.socket.query(query) as { getRuntimeErrorMessages: pst.ListResponse<pst.RuntimeErrorMessage> };
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const RuntimeErrorMessages = result.getRuntimeErrorMessages.objects;
    if (isArray(RuntimeErrorMessages)) {
      return result.getRuntimeErrorMessages;
    } else {
      throw new Error(`[PolkascanExplorerAdapter] getRuntimeErrorMessages: Returned response is invalid.`);
    }
  };
