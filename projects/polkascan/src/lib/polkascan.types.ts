export type Block = {
  hash: string;
  id: number;
  number: number;
  parent_hash: string;
  state_root: string;
  extrinsics_root: string;
};

export type Extrinsic = {
  block_hash: string;
  extrinsic_idx: number;
  transaction_hash?: string;
  block_number: number;
};

export type Event = {
  block_hash: string;
  event_idx: number;
  block_number: number;
};
