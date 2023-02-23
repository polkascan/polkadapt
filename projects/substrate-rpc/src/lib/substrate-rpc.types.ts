export type Block = {
  // eslint-disable-next-line id-blacklist
  number: number;
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
  extrinsics: any[];  // TODO EXTRINSIC
  events: any[];  // TODO EVENT
};
