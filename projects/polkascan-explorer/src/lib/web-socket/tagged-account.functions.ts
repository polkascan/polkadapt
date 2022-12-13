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
import { generateObjectQuery, generateObjectsListQuery, isArray, isObject, isString } from './helpers';

const taggedAccountFields: (keyof pst.TaggedAccount)[] = [
  'accountId',
  'tagName',
  'tagType',
  'tagSubType',
  'riskLevel',
  'riskLevelVerbose',
  'originatorInfo',
  'beneficiaryInfo'
];


export const getTaggedAccount = (adapter: Adapter) =>
  async (accountId: string): Promise<pst.TaggedAccount> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const filters: string[] = [];

    if (isString(accountId)) {
      filters.push(`accountId: "${accountId}"`);
    } else {
      throw new Error(
        '[PolkascanExplorerAdapter] getTaggedAccount: ' +
        'Provide the accountId hex (string).'
      );
    }

    const query = generateObjectQuery('getTaggedAccount', taggedAccountFields, filters);

    const result = await adapter.socket.query(query) as { getTaggedAccount: pst.TaggedAccount };
    const account = result.getTaggedAccount;
    if (account === null || isObject(account)) {
      return account;
    } else {
      throw new Error(`[PolkascanExplorerAdapter] getTaggedAccount: Returned response is invalid.`);
    }
  };


export const getTaggedAccounts = (adapter: Adapter) =>
  async (tagType?: string): Promise<pst.ListResponse<pst.TaggedAccount>> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const filters: string[] = [];

    if (isString(tagType)) {
        filters.push(`tagType: "${tagType}"`);
    }

    const query = generateObjectsListQuery('getTaggedAccounts', taggedAccountFields, filters);

    const result = await adapter.socket.query(query) as { getTaggedAccounts: pst.ListResponse<pst.TaggedAccount> };
    const accounts = result.getTaggedAccounts.objects;
    if (isArray(accounts)) {
      return result.getTaggedAccounts;
    } else {
      throw new Error(`[PolkascanExplorerAdapter] getTaggedAccounts: Returned response is invalid.`);
    }
  };
