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

import { AdapterApiCallWithIdentifiers, AdapterBase, types } from '@polkadapt/core';
import { map, Observable, switchMap } from 'rxjs';
import {
  getBlock,
  getBlocks,
  getBlocksFrom,
  getBlocksUntil,
  getLatestBlock,
  subscribeNewBlock
} from './queries/block.functions';
import { getChainProperties } from './queries/chain.functions';
import {
  AccountEventsFilters,
  EventsFilters,
  getEvent,
  getEvents,
  getEventsByAccount,
  subscribeNewEvent,
  subscribeNewEventByAccount
} from './queries/event.functions';
import { fromFetch } from 'rxjs/internal/observable/dom/fetch';
import { getLatestRuntime, getRuntime, getRuntimes } from './queries/runtime.functions';
import { ExtrinsicsFilters, getExtrinsic, getExtrinsics, subscribeNewExtrinsic } from './queries/extrinsic.functions';

export type Api = {
  getChainProperties: AdapterApiCallWithIdentifiers<[], types.ChainProperties>;
  getBlock: AdapterApiCallWithIdentifiers<[hashOrNumber: string | number], types.Block>;
  getLatestBlock: AdapterApiCallWithIdentifiers<[], types.Block>;
  subscribeNewBlock: AdapterApiCallWithIdentifiers<[], types.Block>;
  getBlocks: AdapterApiCallWithIdentifiers<[pageSize?: number], types.Block[]>;
  getBlocksFrom: AdapterApiCallWithIdentifiers<[hashOrNumber: string | number, pageSize?: number], types.Block[]>;
  getBlocksUntil: AdapterApiCallWithIdentifiers<[hashOrNumber: string | number, pageSize?: number], types.Block[]>;
  getEvent: AdapterApiCallWithIdentifiers<[blockNumber: number, eventIdx: number], types.Event>;
  getEvents: AdapterApiCallWithIdentifiers<[filters?: EventsFilters, pageSize?: number], types.Event[]>;
  subscribeNewEvent: AdapterApiCallWithIdentifiers<[filters?: EventsFilters], types.Event>;
  getEventsByAccount: AdapterApiCallWithIdentifiers<[accountIdHex: string, filters?: AccountEventsFilters, pageSize?: number],
    types.AccountEvent[]>;
  subscribeNewEventByAccount: AdapterApiCallWithIdentifiers<[accountIdHex: string, filters?: AccountEventsFilters], types.AccountEvent>;
  getExtrinsic: AdapterApiCallWithIdentifiers<[blockNumber: number, extrinsicIdx: number], types.Extrinsic>;
  getExtrinsics: AdapterApiCallWithIdentifiers<[filters?: ExtrinsicsFilters, pageSize?: number], types.Extrinsic[]>;
  subscribeNewExtrinsic: AdapterApiCallWithIdentifiers<[filters?: ExtrinsicsFilters], types.Extrinsic>;
  getRuntime: AdapterApiCallWithIdentifiers<[specName: string, specVersion: number], types.Runtime>;
  getRuntimes: AdapterApiCallWithIdentifiers<[pageSize?: number], types.Runtime[]>;
  getLatestRuntime: AdapterApiCallWithIdentifiers<[], types.Runtime>;
};

export type Config = {
  chain: string;
  archiveUrl: string;
  explorerUrl: string;
  giantSquidExplorerUrl: string;
  giantSquidMainUrl: string;
  balancesUrl: string;
};

type CreateQueryArgs = [contentType: string, fields: Fields, where?: Where, orderBy?: string, limit?: number, offset?: number];

export type Fields = (string | { [field: string]: Fields })[];

export type Where = {
  [field: string]: string | number | boolean | Where | string[] | number[];
};

type RequestResult<T> = {
  'data': {
    [contentType: string]: T;
  };
};

export class Adapter extends AdapterBase {
  name = 'subsquid';
  config: Config;
  api: Api = {
    getChainProperties: getChainProperties(this),
    getBlock: getBlock(this),
    getLatestBlock: getLatestBlock(this),
    subscribeNewBlock: subscribeNewBlock(this),
    getBlocks: getBlocks(this),
    getBlocksFrom: getBlocksFrom(this),
    getBlocksUntil: getBlocksUntil(this),
    getEvent: getEvent(this),
    getEvents: getEvents(this),
    subscribeNewEvent: subscribeNewEvent(this),
    getEventsByAccount: getEventsByAccount(this),
    subscribeNewEventByAccount: subscribeNewEventByAccount(this),
    getExtrinsic: getExtrinsic(this),
    getExtrinsics: getExtrinsics(this),
    subscribeNewExtrinsic: subscribeNewExtrinsic(this),
    getRuntime: getRuntime(this),
    getRuntimes: getRuntimes(this),
    getLatestRuntime: getLatestRuntime(this)
  };


  constructor(config: Config) {
    super(config.chain);
    this.config = config;
  }

  queryArchive<T>(...args: CreateQueryArgs): Observable<T> {
    return this.requestQuery<T>(this.config.archiveUrl, ...args);
  }

  queryExplorer<T>(...args: CreateQueryArgs): Observable<T> {
    return this.requestQuery<T>(this.config.explorerUrl, ...args);
  }

  queryGSExplorer<T>(...args: CreateQueryArgs): Observable<T> {
    return this.requestQuery<T>(this.config.giantSquidExplorerUrl, ...args);
  }

  queryGSMain<T>(...args: CreateQueryArgs): Observable<T> {
    return this.requestQuery<T>(this.config.giantSquidMainUrl, ...args);
  }

  queryBalances<T>(...args: CreateQueryArgs): Observable<T> {
    return this.requestQuery<T>(this.config.balancesUrl, ...args);
  }

  private formatFields(fields: Fields, indent = ''): string {
    return fields.map(field => {
      if (typeof field === 'object') {
        const key = Object.keys(field)[0];
        const subfields = this.formatFields(field[key], indent + '  ');
        return `${indent}${key} {\n${subfields}\n${indent}}`;
      } else {
        return indent + field;
      }
    }).join('\n');
  }

  private createQuery(contentType: string, fields: Fields, where?: Where, orderBy?: string, limit?: number, offset?: number): string {
    let argsString = '';
    if (where || orderBy && orderBy.length > 0 || limit && limit > 0 || offset && offset > 0) {
      const args: string[] = [];
      if (where) {
        args.push(`where:${JSON.stringify(where).replace(/"([^"]+)":/g, '$1:')}`);
      }
      if (orderBy) {
        args.push(`orderBy:${orderBy}`);
      }
      if (limit) {
        args.push(`limit:${limit}`);
      }
      if (offset) {
        args.push(`offset:${offset}`);
      }
      argsString = `(${args.join(', ')})`;
    }
    return `
      query {
        ${contentType}${argsString} {
          ${this.formatFields(fields)}
        }
      }
    `;
  }

  private requestQuery<T>(url: string, contentType: string, fields: Fields, where?: Where,
                          orderBy?: string, limit?: number, offset?: number): Observable<T> {
    const query: string = this.createQuery(contentType, fields, where, orderBy, limit, offset);
    return fromFetch(url, {
      method: 'POST',
      // eslint-disable-next-line @typescript-eslint/naming-convention
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({query})
    }).pipe(
      switchMap(response => {
        if (response.ok) {
          return response.json() as Promise<RequestResult<T>>;
        } else {
          throw new Error('[SubsquidAdapter] Request failed.');
        }
      }),
      map(result => result.data[contentType])
    );
  }
}
