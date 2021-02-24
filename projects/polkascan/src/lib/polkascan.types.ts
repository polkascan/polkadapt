export type Block = {
  hash: string;
  id: number;
  number: number;
  parentHash: string;
  stateRoot: string;
  extrinsicsRoot: string;
  countExtrinsics: number;
  countEvents: number;
};

export type Extrinsic = {
  blockHash: string;
  extrinsicIdx: number;
  transactionHash?: string;
  blockNumber: number;
};

export type Event = {
  blockHash: string;
  eventIdx: number;
  blockNumber: number;
};
