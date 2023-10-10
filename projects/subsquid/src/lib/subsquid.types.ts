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
  complete: number;
};

export type GSExplorerBlockOutput = {
  // eslint-disable-next-line id-blacklist
  number: number;  // PK
  countCalls: number;
  countExtrinsics: number;
  countEvents: number;
};


export type ExplorerChainInfoOutput = {
  chainSS58: number;
  chainDecimals: number[];
  chainTokens: string[];
  name: string;
};

export type ArchiveChainInfoOutput = {
  specName: string | null;
};

export type ChainProperties = Partial<ExplorerChainInfoOutput & ArchiveChainInfoOutput>;

export type Block = Partial<ArchiveBlockOutput & GSExplorerBlockOutput>;

export type Event = {
  blockNumber: number;  // PK
  eventIdx: number;  // PK
  extrinsicIdx: number | null;
  event?: string | null;
  eventModule: string | null;   // is pallet / palletName
  eventName: string | null;
  attributes: { [k: string]: any } | null;
  blockDatetime: string | null;
  blockHash: string;
  eventPhaseName: string | null;
  specName: string | null;
  specVersion: number | null;
};

export type AccountEvent = {
  blockNumber: number;  // PK
  eventIdx: number;  // PK
  attributeName: string; // PK
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
  callArguments: { [k: string]: any } | null;
  signed: number | null;
  multiAddressAccountId: string | null;
  signature: string | null;
  feeTotal: number | null;
  tip: number | null;
  error: string | null;
  blockDatetime: string | null;
  blockHash: string | null;
  specName: string | null;
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
