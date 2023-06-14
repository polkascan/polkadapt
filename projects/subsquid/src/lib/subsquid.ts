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

import { AdapterBase, AdapterApiCallWithIdentifiers, types } from '@polkadapt/core';
import * as st from './subsquid.types';
import { map, merge, Observable, switchMap, tap } from 'rxjs';
import { fromFetch } from 'rxjs/internal/observable/dom/fetch';

export type Api = {
  getBlocks: AdapterApiCallWithIdentifiers<[pageSize?: number], types.Block[]>;
  getBlock: AdapterApiCallWithIdentifiers<[hashOrNumber: string | number], types.Block>;
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

type Fields = (string | {[field: string]: Fields})[];

type Where = {
  [field: string]: string | number | Where;
};

type RequestResult<T> = {
  'data': {
    [contentType: string]: T[];
  };
};

export type ArchiveBlockInput = {
  extrinsicsRoot: string;
  hash: string;
  height: number;
  parentHash: string;
  spec: {
    specName: string;
    specVersion: number;
  };
  stateRoot: string;
  timestamp: string;
  validator: string;
};

export type GSExplorerBlockInput = {
  height: number;
  extrinsicsCount: number;
  callsCount: number;
  eventsCount: number;
};

export class Adapter extends AdapterBase {
  name = 'subsquid';
  config: Config;
  api: Api = {
    getBlock: (hashOrNumber) => this.getBlocksBase(1, hashOrNumber).pipe(map(blocks => blocks[0]), tap({next: (v => console.log(v))})),
    getBlocks: (pageSize?) => this.getBlocksBase(pageSize).pipe(tap({next: (v => console.log(v))}))
  };

  constructor(config: Config) {
    super(config.chain);
    this.config = config;
    this.api.getBlocks.identifiers = this.api.getBlock.identifiers = ['number'];
  }

  private getBlocksBase(pageSize?: number, hashOrNumber?: string | number): Observable<types.Block[]> {
    const contentType = 'blocks';
    const orderBy = 'id_DESC';
    let where: Where | undefined;
    if (typeof hashOrNumber !== 'undefined') {
      const whereKey = (typeof hashOrNumber === 'string' && hashOrNumber.startsWith('0x')) ? 'hash_eq' : 'height_eq';
      where = {};
      where[whereKey] = hashOrNumber;
    }
    return merge(
      this.queryArchive<ArchiveBlockInput>(
        contentType,
        ['extrinsicsRoot', 'hash', 'height', 'parentHash', {spec: ['specName', 'specVersion']}, 'stateRoot', 'timestamp', 'validator'],
        where,
        orderBy,
        pageSize
      ).pipe(
        map(blocks => blocks.map<st.ArchiveBlockOutput>(block => ({
          // eslint-disable-next-line id-blacklist
          number: block.height,
          hash: block.hash,
          parentHash: block.parentHash,
          stateRoot: block.stateRoot,
          extrinsicsRoot: block.extrinsicsRoot,
          datetime: block.timestamp,
          authorAccountId: block.validator,
          specName: block.spec.specName,
          specVersion: block.spec.specVersion,
          complete: 1
        })))
      ),
      this.queryGSExplorer<GSExplorerBlockInput>(
        contentType,
        ['height', 'callsCount', 'eventsCount', 'extrinsicsCount'],
        where,
        orderBy,
        pageSize
      ).pipe(
        map(blocks => blocks.map<st.GSExplorerBlockOutput>(block => ({
          // eslint-disable-next-line id-blacklist
          number: block.height,
          countCalls: block.callsCount,
          countEvents: block.eventsCount,
          countExtrinsics: block.extrinsicsCount
        })))
      )
    );
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
                          orderBy?: string, limit?: number, offset?: number): Observable<T[]> {
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
          throw new Error('Subsquid request failed.');
        }
      }),
      map(result => result.data[contentType])
    );
  }

  private queryArchive<T>(...args: CreateQueryArgs): Observable<T[]> {
    return this.requestQuery<T>(this.config.archiveUrl, ...args);
  }

  private queryGSExplorer<T>(...args: CreateQueryArgs): Observable<T[]> {
    return this.requestQuery<T>(this.config.giantSquidExplorerUrl, ...args);
  }
}
