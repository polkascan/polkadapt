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

import { BN } from '@polkadot/util';


export type ChainProperties = {
  chainSS58: number | null;
  chainDecimals: number[] | null;
  chainTokens: string[] | null;
  systemName: string | null;
  specName: string | null;
  blockTime: number | null;
};

export type Header = {
  // eslint-disable-next-line id-blacklist
  number: number;
  parentHash: string;
  stateRoot: string;
  extrinsicsRoot: string;
};

export type Block = {
  // eslint-disable-next-line id-blacklist
  number: number;
  hash: string;
  parentHash: string;
  stateRoot: string;
  extrinsicsRoot: string;
  datetime: string | null;
  countExtrinsics: number;
  countEvents: number;
  countLogs: number;
  extrinsics: any[];
  events: any[];
  specName: string;
  specVersion: number;
};

export type Account = {
  id: string;
  nonce?: number;
  data: {
    free?: BN;
    reserved?: BN;
    frozen?: BN;
    miscFrozen?: BN;
    feeFrozen?: BN;
  };
};

type AccountJudgement = {
  isUnknown: boolean;
  isFeePaid: boolean;
  asFeePaid: BN;
  isReasonable: boolean;
  isKnownGood: boolean;
  isOutOfDate: boolean;
  isLowQuality: boolean;
  isErroneous: boolean;
  type: 'Unknown' | 'FeePaid' | 'Reasonable' | 'KnownGood' | 'OutOfDate' | 'LowQuality' | 'Erroneous';
};

export type AccountIdentity = {
  display?: string;
  displayParent?: string;
  email?: string;
  image?: string;
  legal?: string;
  other?: Record<string, string>;
  parent?: string;
  pgp?: string;
  riot?: string;
  twitter?: string;
  web?: string;
  judgements: [number, AccountJudgement][];
};

export type AccountInformation = {
  accountId?: string;
  accountIndex?: number;
  identity: AccountIdentity;
  nickname?: string;
};

export type AccountFlags = {
  isCouncil: boolean;
  isSociety: boolean;
  isSudo: boolean;
  isTechCommittee: boolean;
};

export type AccountStaking = {
  bonded: BN;
  redeemable: BN;
  unbonding: BN;
}

export type AccountBalances = {
  lockedBalance: BN;
  freeBalance: BN;
  reservedBalance: BN;
  availableBalance: BN;
}

export type Event = {
  blockNumber: number;  // PK
  eventIdx: number;  // PK
  extrinsicIdx: number | null;
  event?: string | null;
  eventModule: string | null;   // is pallet / palletName
  eventName: string | null;
  attributes?: { [k: string]: any } | undefined | null;
  meta?: { [k: string]: any } | undefined | null;
  blockDatetime: string | null;
  blockHash: string;
  specName: string | null;
  specVersion: number | null;
};

export type Extrinsic = {
  blockNumber: number;  // PK
  extrinsicIdx: number;  // PK
  hash: string | null;
  version: number | null;
  nonce: number | null;
  era: number | null;
  callModule: string | null;
  callName: string | null;
  callArguments: unknown[] | null;
  signed: number | null;
  multiAddressAccountId: string | null;
  signature: string | null;
  tip: number | null;
  blockDatetime: string | null;
  blockHash: string | null;
  specName: string | null;
  specVersion: number | null;
};

export type Runtime = {
  specName: string;
  specVersion: number;
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

export type RuntimePallet = {
  specName: string;
  specVersion: number;
  pallet: string;
  prefix: string | null;
  name: string | null;
  countCallFunctions: number;
  countStorageFunctions: number;
  countEvents: number;
  countConstants: number;
  countErrors: number;
};

export type RuntimeCall = {
  specName: string;
  specVersion: number;
  pallet: string;
  callName: string;
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
  callArgumentIdx: number;  // PK
  name: string | null;
  scaleType: string | null;
  scaleTypeComposition: string | null;
};

export type RuntimeEvent = {
  specName: string;
  specVersion: number;
  pallet: string;
  eventName: string | null;
  palletEventIdx: number;
  lookup: string;
  documentation: string | null;
  countAttributes: number;
};

export type RuntimeEventAttribute = {
  specName: string;
  specVersion: number;
  pallet: string;
  eventName: string;
  eventAttributeName: string;
  scaleType: string | null;
  scaleTypeComposition: string | null;
};

export type RuntimeConstant = {
  specName: string;
  specVersion: number;
  pallet: string;
  constantName: string;
  palletConstantIdx: number;
  scaleType: string | null;
  scaleTypeComposition: string | null;
  value: any | null;
  documentation: string | null;
};

export type RuntimeStorage = {
  specName: string;
  specVersion: number;
  pallet: string;
  storageName: string;
} & Partial<{
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
}>;

export type RuntimeErrorMessage = {
  specName: string;
  specVersion: number;
  pallet: string;
  errorName: string;
  palletIdx?: number;
  errorIdx: number;
  documentation: string | null;
};
