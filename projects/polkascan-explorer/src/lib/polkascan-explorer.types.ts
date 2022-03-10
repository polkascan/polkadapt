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

export type ListResponse<T> = {
  objects: T[];
  pageInfo?: {
    pageSize: number;
    pageNext: string;
    pagePrev: string;
  };
};


export type Block = {
  // eslint-disable-next-line id-blacklist
  number: number;  // PK
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
  blockNumber: number;  // PK
  eventIdx: number;  // PK
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
  blockNumber: number;  // PK
  extrinsicIdx: number;  // PK
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


export type Runtime = {
  specName: string;  // PK
  specVersion: number;  // PK
  implName: string | null;
  implVersion: number | null;
  authoringVersion: number | null;
  countCallFunctions: number;
  countEvents: number;
  countPallets: number;
  countStorageFunctions: number;
  countConstants: number;
  countErrors: number;
};


export type RuntimeCall = {
  specName: string;  // PK
  specVersion: number;  // PK
  pallet: string;  // PK
  callName: string;  // PK
  palletCallIdx: number;
  lookup: string;
  documentation: string | null;
  countArguments: number;
};

export type RuntimeCallArgument = {
  specName: string;  // PK
  specVersion: number;  // PK
  pallet: string;  // PK
  callName: string;  // PK
  callArgumentIdx: number | null;  // PK
  name: string | null;
  scaleType: string | null;
};


export type RuntimeConstant = {
  specName: string;  // PK
  specVersion: number;  // PK
  pallet: string;  // PK
  constantName: string | null;  // PK
  palletConstantIdx: number;
  scaleType: string | null;
  value: any | null;
  documentation: string | null;
};


export type RuntimeErrorMessage = {
  specName: string;  // PK
  specVersion: number;  // PK
  pallet: string;  // PK
  errorName: string | null;  // PK
  palletIdx: number;
  errorIdx: number;
  documentation: string | null;
};


export type RuntimeEvent = {
  specName: string;  // PK
  specVersion: number;  // PK
  pallet: string;  // PK
  eventName: string | null;  // PK
  palletEventIdx: number;
  lookup: string;
  documentation: string | null;
  countAttributes: number;
};


export type RuntimeEventAttribute = {
  specName: string;  // PK
  specVersion: number;  // PK
  pallet: string;  // PK
  eventName: string | null;  // PK
  eventAttributeIdx: number;  // PK
  scaleType: string | null;
};


export type RuntimePallet = {
  specName: string;  // PK
  specVersion: number;  // PK
  pallet: string;  // PK
  prefix: string | null;
  name: string | null;
  countCallFunctions: number;
  countStorageFunctions: number;
  countEvents: number;
  countConstants: number;
  countErrors: number;
};


export type RuntimeStorage = {
  specName: string;  // PK
  specVersion: number;  // PK
  pallet: string;  // PK
  storageName: string;  // PK
  palletStorageIdx: number;
  default: string | null;
  modifier: string | null;
  keyPrefixPallet: string | null;
  keyPrefixName: string | null;
  key1ScaleType: string | null;
  key1Hasher: string | null;
  key2ScaleType: string | null;
  key2Hasher: string | null;
  valueScaleType: string | null;
  isLinked: boolean;
  documentation: string | null;
};


export type RuntimeType = {
  specName: string;  // PK
  specVersion: number;  // PK
  scaleType: string;  // PK
  decoderClass: string | null;
  isCorePrimitive: boolean;
  isRuntimePrimitive: boolean;
};


export type Log = {
  blockNumber: number;  // PK
  logIdx: number;  // PK
  typeId: number | null;
  typeName: string | null;
  data: string;
  blockDatetime: string | null;
  blockHash: string;
  specName: string | null;
  specVersion: string | null;
  complete: number;
};


export type Transfer = {
  blockNumber: number;  // PK
  eventIdx: number;  // PK
  extrinsicIdx: number | null;
  fromMultiAddressType: string | null;
  fromMultiAddressAccountId: string | null;
  fromMultiAddressAccountIndex: number | null;
  fromMultiAddressRaw: string | null;
  fromMultiAddressAddress32: string | null;
  fromMultiAddressAddress20: string | null;
  toMultiAddressType: string | null;
  toMultiAddressAccountId: string | null;
  toMultiAddressAccountIndex: number | null;
  toMultiAddressRaw: string | null;
  toMultiAddressAddress32: string | null;
  toMultiAddressAddress20: string | null;
  value: number | null;
  blockDatetime: string | null;
  blockHash: string;
  complete: boolean;
};
