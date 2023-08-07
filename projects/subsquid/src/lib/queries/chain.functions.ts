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

import { Adapter } from '../subsquid';
import { map, merge, Observable } from 'rxjs';
import { types } from '@polkadapt/core';
import { ArchiveChainInfoOutput, ExplorerChainInfoOutput } from '../subsquid.types';


export type ExplorerChainInfoInput = {
  name: string;
  prefix: number;
  tokens: {
    decimals: string;
    symbol: string;
  }[];
};

export type ArchiveChainInfoInput = {
  specName: string;
};

export const getChainProperties = (adapter: Adapter) =>
  (): Observable<types.ChainProperties> =>
    merge(
      adapter.queryExplorer<ExplorerChainInfoInput>(
        'chainInfo',
        ['name', 'prefix', {tokens: ['decimals', 'symbol']}]
      ).pipe(
        map<ExplorerChainInfoInput, ExplorerChainInfoOutput>((chainInfo) => ({
          chainSS58: chainInfo.prefix,
          chainDecimals: chainInfo.tokens && chainInfo.tokens.map((token) => Number.parseInt(token.decimals, 10)) || [],
          chainTokens: chainInfo.tokens && chainInfo.tokens.map((token) => token.symbol) || [],
          name: chainInfo.name
        }))),
      adapter.queryArchive<ArchiveChainInfoInput>(
        'metadata',
        ['specName'],
        undefined,
        'blockHeight_DESC',
        1
      ).pipe(
        map<ArchiveChainInfoInput, ArchiveChainInfoOutput>((metadata) => ({
          specName: metadata.specName
        })))
    );
