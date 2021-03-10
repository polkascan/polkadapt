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

export type ListResponse<T> = {
  objects: T[];
  pageInfo: {
    pageSize: number;
    pageNext: string;
    pagePrev: string;
  };
};


export type Block = {
  number: number; // primary key
  parentNumber: number | null;
  hash: string;
  parentHash: string;
  stateRoot: string;
  extrinsicsRoot: string;
  datetime: string | null;
  authorAuthorityIndex: number | null;
  authorSlotNumber: number | null;
  authorAccountId: string | null;
  countExtrinsics: number;
  countEvents: number;
  countLogs: number;
  totalFee: number | null;
  totalFeeTreasury: number | null;
  totalFeeBlockAuthor: number | null;
  specName: string;
  specVersion: number;
  complete: number;
};


export type Event = {
  blockNumber: number; // combined primary key blockNumber, eventIdx
  eventIdx: number; // combined primary key blockNumber, eventIdx
  extrinsicIdx: number | null;
  event: string | null;
  eventModule: string | null;
  eventName: string | null;
  eventPhaseIdx: number | null;
  eventPhaseName: string | null;
  attributes: string | null;
  topics: string | null;
  blockDatetime: string | null;
  blockHash: string;
  specName: string | null;
  specVersion: number | null;
  complete: number;
};


export type Extrinsic = {
  blockNumber: number; // combined primary key blockNumber, extrinsicIdx
  extrinsicIdx: number; // combined primary key blockNumber, extrinsicIdx
  hash: string | null;
  version: number | null;
  versionInfo: number | null;
  call: number | null;
  callModule: string | null;
  callName: string | null;
  callArguments: string | null;
  callHash: string | null;
  signed: number | null;
  multiAddressType: string | null;
  multiAddressAccountId: string | null;
  multiAddressAccountIndex: number | null;
  multiAddressRaw: string | null;
  multiAddressAddress32: string | null;
  multiAddressAddress20: string | null;
  signature: string | null;
  signatureVersion: number | null;
  extrinsicLength: number | null;
  nonce: number | null;
  era: string | null;
  eraImmortal: number | null;
  eraBirth: number | null;
  eraDeath: number | null;
  feeTotal: number | null;
  feeTreasury: number | null;
  feeBlockAuthor: number | null;
  tip: number | null;
  weight: number | null;
  success: number | null;
  errorModuleIdx: number | null;
  errorModule: string | null;
  errorNameIdx: number | null;
  errorName: string | null;
  blockDatetime: string | null;
  blockHash: string | null;
  specName: string | null;
  specVersion: number | null;
  complete: number;
};
