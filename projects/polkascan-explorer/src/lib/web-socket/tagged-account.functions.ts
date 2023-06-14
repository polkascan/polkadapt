/*
 * PolkADAPT
 *
 * Copyright 2020-2023 Polkascan Foundation (NL)
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
import { types } from '@polkadapt/core';
import {
  createObjectObservable,
  createObjectsListObservable,
  generateObjectQuery,
  isString
} from './helpers';
import { Observable } from 'rxjs';

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

const identifiers = ['accountId'];

export const getTaggedAccount = (adapter: Adapter) => {
  const fn = (accountId: string): Observable<types.TaggedAccount> => {
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
    return createObjectObservable<pst.TaggedAccount>(adapter, 'getTaggedAccount', query);
  };
  fn.identifiers = identifiers;
  return fn;
};


export const getTaggedAccounts = (adapter: Adapter) => {
  const fn = (tagType?: string): Observable<pst.TaggedAccount[]> => {
    if (!adapter.socket) {
      throw new Error('[PolkascanExplorerAdapter] Socket is not initialized!');
    }

    const filters: string[] = [];

    if (isString(tagType)) {
      filters.push(`tagType: "${tagType}"`);
    }

    return createObjectsListObservable<types.TaggedAccount>(adapter, 'getTaggedAccounts', taggedAccountFields, filters, identifiers);
  };
  fn.identifiers = identifiers;
  return fn;
};
