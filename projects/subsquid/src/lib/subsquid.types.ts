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

export type GSExplorerBlockOutput = {
  // eslint-disable-next-line id-blacklist
  number: number;  // PK
  hash: string;
  parentHash: string;
  datetime: string | null;
  // specName: string;  // Not available in giant squid
  specVersion: number;
  authorAccountId: string | null;  // validator
  countCalls: number;
  countExtrinsics: number;
  countEvents: number;
  complete: number;
  // stateRoot: string;  // Not available in giant squid
  // extrinsicsRoot: string;  // Not available in giant squid
};

export type Block = GSExplorerBlockOutput;

// export type XXChainInfoOutput = {
//   chainSS58: number;
//   chainDecimals: number[];
//   chainTokens: string[] ;
//   name: string;
//   specName: string | null;
//   specVersion: string | null;
// };

// export type ChainProperties = XXChainInfoOutput;


export type Event = {
  blockNumber: number;  // PK
  eventIdx: number;  // PK
  extrinsicIdx: number | null;
  event?: string | null;
  eventModule: string | null;   // is pallet / palletName
  eventName: string | null;
  // attributes: { [k: string]: any } | null;
  blockDatetime: string | null;
  blockHash: string;
  // specName: string | null;   // Not available in giant squid
  specVersion: number | null;
};

export type AccountEvent = {
  blockNumber: number;  // PK
  eventIdx: number;  // PK
  attributeName: string | null; // PK
  accountId: string;
  attributes: string | null;
  pallet: string;
  eventName: string;
  blockDatetime: string | null;
  sortValue: number | null;
  extrinsicIdx: number | null;
};

export type Extrinsic = {
  blockNumber: number;  // PK
  extrinsicIdx: number;  // PK
  hash: string | null;
  version: number | null;
  callModule: string | null;
  callName: string | null;
  // callArguments: { [k: string]: any } | null;
  signed: number | null;
  multiAddressAccountId: string | null;
  signature: string | null;
  feeTotal: number | null;
  tip: number | null;
  error: string | null;
  blockDatetime: string | null;
  blockHash: string | null;
  // specName: string | null;  // Not available in giant squid
  specVersion: number | null;
};

export type Runtime = {
  specName: string;  // PK
  specVersion: number;  // PK
  blockNumber: number;
  blockHash: string;
};

export type ChainStatistics = {
  accountsTotal: number;
  chainFinalizedBlocks: number;
  chainSignedExtrinsics: number;
  balancesTotalIssuance: string;
  balancesTransfersAmount: string;
  balancesTransfersVolume: string;
  parachainStakingCollatorsAmount: number;
  parachainStakingTotalStakeCollators: string;
  parachainStakingCurrentRound: number;
  parachainStakingTotalStakeDelegators: string;
  slotsTokensLockedInParachains: string;
  nominationPoolsMembersAmount: number;
  nominationPoolsPoolsActiveAmount: number;
  nominationPoolsPoolsActiveTotalStake: string;
  nominationPoolsPoolsInactiveAmount: number;
  nominationPoolsPoolsInactiveTotalStake: string;
  stakingValidatorsIdealAmount: number;
  stakingValidatorsAmount: number;
  stakingTotalStakeValidatorsSingleAccount: string;
  stakingTotalStakeValidatorsMultiAccount: string;
  stakingTotalStakeValidators: string;
  stakingTotalStakeNominatorsInactive: string;
  stakingTotalStakeNominatorsActive: string;
  stakingTotalStake: string;
  stakingRewardsRatio: number;
  stakingNominatorsInactiveAmount: number;
  stakingNominatorsActiveAmount: number;
  stakingMinActiveNominatorStake: string;
  stakingInflationRatio: number;
  stakingCurrentEra: number;
  stakingActiveValidatorsAmount: number;
  lastUpdate: string;
}

export type Transfer = {
  blockNumber: number;
  eventIdx: number;
  blockDatetime: string;
  amount: string;
  extrinsicHash: string;
  from: string;
  to: string;
  success: boolean;
  attributeName?: string;
}

export type Account = {
  id: string;
  identity: {
    display: string;
  }
};
