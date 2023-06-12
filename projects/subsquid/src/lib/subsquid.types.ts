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

export type ListResponse<T> = {
  objects: T[];
  pageInfo?: {
    pageSize: number;
    pageNext: string;
    pagePrev: string;
    blockLimitOffset?: number;
    blockLimitCount?: number;
  };
};

export type ArchiveBlockOutput = {
  // eslint-disable-next-line id-blacklist
  number: number;  // PK
  hash: string;
  parentHash: string;
  stateRoot: string;
  extrinsicsRoot: string;
  datetime: string | null;
  authorAccountId: string | null;
  specName: string;
  specVersion: number;
};

export type GSExplorerBlockOutput = {
  // eslint-disable-next-line id-blacklist
  number: number;  // PK
  countCalls: number;
  countExtrinsics: number;
  countEvents: number;
};

export type Block = Partial<ArchiveBlockOutput & GSExplorerBlockOutput>;


export type Event = {
  blockNumber: number;  // PK
  eventIdx: number;  // PK
  extrinsicIdx: number | null;
  event: string | null;
  eventModule: string | null;
  eventName: string | null;
};


export type Extrinsic = {
  blockNumber: number;  // PK
  extrinsicIdx: number;  // PK
  hash: string | null;
};
