import { Adapter } from '../subsquid';
import { catchError, EMPTY, map, merge, Observable, throwError } from 'rxjs';
import * as st from '../subsquid.types';

type GSStatsCountersInput = {
  chainFinalizedBlocks: number;
  chainSignedExtrinsics: number;
  lastUpdate: string;
}

type GSStatsBalancesInput = {
  balancesTotalIssuance: string;
  balancesTransfersAmount: string;
  balancesTransfersVolume: string;
  lastUpdate: string;
}

type GSStatsParachainsInput = {
  parachainStakingCollatorsAmount: number;
  parachainStakingTotalStakeCollators: string;
  parachainStakingCurrentRound: number;
  parachainStakingTotalStakeDelegators: string;
  slotsTokensLockedInParachains: string;
  lastUpdate: string;
}

type GSStatsNominationInput = {
  nominationPoolsMembersAmount: number;
  nominationPoolsPoolsActiveAmount: number;
  nominationPoolsPoolsActiveTotalStake: string;
  nominationPoolsPoolsInactiveAmount: number;
  nominationPoolsPoolsInactiveTotalStake: string;
  lastUpdate: string;
}

type GSStatsStakingInput = {
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

type GSStatsInput =
  (GSStatsCountersInput
    & GSStatsBalancesInput
    & GSStatsParachainsInput
    & GSStatsNominationInput
    & GSStatsStakingInput)[];

const counters = [
  'chainFinalizedBlocks',
  'chainSignedExtrinsics',
]

const balances = [
  'balancesTotalIssuance',
  'balancesTransfersAmount',
  'balancesTransfersVolume',
]

const nominationPools = [
  'nominationPoolsMembersAmount',
  'nominationPoolsPoolsActiveAmount',
  'nominationPoolsPoolsActiveTotalStake',
  'nominationPoolsPoolsInactiveAmount',
  'nominationPoolsPoolsInactiveTotalStake',
]

const parachains = [
  'parachainStakingCollatorsAmount',
  'parachainStakingCurrentRound',
  'parachainStakingTotalStakeCollators',
  'parachainStakingTotalStakeDelegators',
  'slotsTokensLockedInParachains',
]

const staking = [
  'stakingActiveValidatorsAmount',
  'stakingCurrentEra',
  'stakingInflationRatio',
  'stakingMinActiveNominatorStake',
  'stakingNominatorsActiveAmount',
  'stakingNominatorsInactiveAmount',
  'stakingRewardsRatio',
  'stakingTotalStake',
  'stakingTotalStakeNominatorsActive',
  'stakingTotalStakeValidators',
  'stakingTotalStakeNominatorsInactive',
  'stakingTotalStakeValidatorsMultiAccount',
  'stakingTotalStakeValidatorsSingleAccount',
  'stakingValidatorsAmount',
  'stakingValidatorsIdealAmount'
]

type GSStatsAccountsInput = {
  totalCount: number;
}

const account = [
  'totalCount'
]

const identifiers = ['id'];

export const getLatestStatistics = (adapter: Adapter) => {
  const fn = () => {
    const statisticsObservable = adapter.queryGSStats<GSStatsInput>(
      'currents',
      [
        ...counters,
        ...balances,
        ...nominationPools,
        ...parachains,
        ...staking,
        'lastUpdate',
        'id'
      ]
    ).pipe(
      catchError(() => {
        // Try fetching in multiple steps.
        const fails: string[] = [];
        return merge(
          adapter.queryGSStats<GSStatsCountersInput[]>('currents', counters).pipe(catchError((err: string) => {
            fails.push(err);
            return fails.length < 5 ? EMPTY : throwError(() => fails);
          })),
          adapter.queryGSStats<GSStatsCountersInput[]>('currents', balances).pipe(catchError((err: string) => {
            fails.push(err);
            return fails.length < 5 ? EMPTY : throwError(() => fails);
          })),
          adapter.queryGSStats<GSStatsCountersInput[]>('currents', nominationPools).pipe(catchError((err: string) => {
            fails.push(err);
            return fails.length < 5 ? EMPTY : throwError(() => fails);
          })),
          adapter.queryGSStats<GSStatsCountersInput[]>('currents', parachains).pipe(catchError((err: string) => {
            fails.push(err);
            return fails.length < 5 ? EMPTY : throwError(() => fails);
          })),
          adapter.queryGSStats<GSStatsCountersInput[]>('currents', staking).pipe(catchError((err: string) => {
            fails.push(err);
            return fails.length < 5 ? EMPTY : throwError(() => fails);
          }))
        )
      }),
      map((stats) => stats[0])
    )

    const totalAccountsObservable = adapter.queryGSStats<GSStatsAccountsInput>('accountsConnection', account, undefined, 'id_DESC').pipe(
      map((response) => {
        return {
          id: "1",
          accountsTotal: response.totalCount
        }
      })
    )

    const errors: string[] = [];

    return merge(
      statisticsObservable.pipe(catchError((err: string) => {
        errors.push(err);
        return errors.length < 2 ? EMPTY : throwError(() => errors);
      })),
      totalAccountsObservable.pipe(catchError((err: string) => {
        errors.push(err);
        return errors.length < 2 ? EMPTY : throwError(() => errors);
      }))
    ) as Observable<st.ChainStatistics>
  }
  fn.identifiers = identifiers;
  return fn;
};
