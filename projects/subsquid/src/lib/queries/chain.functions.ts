import { Adapter } from '../subsquid';
import { map, merge, Observable } from 'rxjs';
import { types } from '@polkadapt/core';
import { ArchiveChainInfoOutput, BalancesChainInfoOutput, ExplorerChainInfoOutput } from '../subsquid.types';


export type ExplorerChainInfoInput = {
  name: string;
  prefix: number;
  tokens: {
    decimals: string;
    symbol: string;
  }[];
};

export type BalancesChainInfoInput = {
  name: string;
  displayName: string;
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
      adapter.queryBalances<BalancesChainInfoInput>(
        'chainInfo',
        ['name', 'displayName', 'prefix', {tokens: ['decimals', 'symbol']}]
      ).pipe(
        map<BalancesChainInfoInput, BalancesChainInfoOutput>((chainInfo) => ({
          chainSS58: chainInfo.prefix,
          chainDecimals: chainInfo.tokens && chainInfo.tokens.map((token) => Number.parseInt(token.decimals, 10)),
          chainTokens: chainInfo.tokens && chainInfo.tokens.map((token) => token.symbol),
          name: chainInfo.name,
          displayName: chainInfo.displayName
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
