import { Adapter } from '../polkascan';
import { Block } from '../polkascan.types';

const genericBlockFields = 'id, hash, parentHash, stateRoot, extrinsicsRoot, countExtrinsics, countEvents';

const isBlockHash = (hash: any): boolean => {
  return (typeof hash === 'string' || (hash as any) instanceof String) && hash.startsWith('0x');
};

const isBlockNumber = (nr: any): boolean => {
  return Number.isInteger(nr) && nr >= 0;
};


export const getBlock = (adapter: Adapter) => {
  return async (hashOrNumber?: string | number): Promise<Block> => {
    const config: string[] = [];

    if (isBlockHash(hashOrNumber)) {
      // Fetch specific block;
      config.push(`filters: { hashEq: "${hashOrNumber}" }`);
    } else if (isBlockNumber(hashOrNumber)) {
      config.push(`filters: { id: ${hashOrNumber} }`);
    }

    const query = `query { getBlock${config.length > 0 ? `(${config.join(', ')})` : ''} { objects { ${genericBlockFields} } } }`;

    try {
      const result = await adapter.socket.query(query);
      const block = result.getBlock;
      block.number = parseInt(block.id as any, 10); // Fix when backend contains number as attribute
      return block;
    } catch (e) {
      throw new Error(e);
    }
  };
};


export const getBlocksFrom = (adapter: Adapter) => {
  return async (hashOrNumber: string | number, pageSize?: number, pageKey?: string): Promise<{blocks: Block[], pageInfo: any}> => {
    const config: string[] = [];

    if (isBlockHash(hashOrNumber)) {
      config.push(`filters: { hashFrom: "${hashOrNumber}" }`);
    } else if (isBlockNumber(hashOrNumber)) {
      config.push(`filters: { idGte: ${hashOrNumber} }`);
    } else {
      throw new Error('[PolkascanAdapter] getBlocksFrom: Supplied hashOrNumber must be of type string or number.');
    }

    if (Number.isInteger(pageSize) && pageSize > 0) {
      config.push(`pageSize: ${pageSize}`);
    }

    if (typeof pageKey === 'string') {
      config.push(`pageKey: ${pageKey}`);
    }

    const query = `query { getBlocks( ${config.join(', ')} ) { object { ${genericBlockFields} }, pageInfo { pageSize, pageNext, pagePrev } } }`;

    try {
      // @ts-ignore
      const result = await adapter.socket.query(query);
      const blocks: Block[] = result.getBlocks;
      blocks.forEach((block) => block.number = parseInt(block.id as any, 10)); // Fix when backend contains number as attribute.
      return {
        blocks,
        pageInfo: result.pageInfo
      };
    } catch (e) {
      throw new Error(e);
    }
  };
};


export const subscribeNewBlock = (adapter: Adapter) => {
  return async (callback: (block: Block) => void): Promise<() => void> => {
    const query = `subscription { subscribeNewBlock { ${genericBlockFields} } }`;
    // return the unsubscribe function.
    return await adapter.socket.createSubscription(query, (result) => {
      try {
        const block = result.subscribeNewBlock;
        block.number = parseInt(block.id as any, 10); // Fix when backend contains number as attribute
        callback(block);
      } catch (e) {
        // Ignore.
      }
    });
  };
};


export const getBlockAugmentation = (adapter: Adapter) => {
  return async (hash: string): Promise<any> => {
    if (!isBlockHash(hash)) {
      throw new Error('[PolkascanAdapter] getBlock (augmentation): Hash must be of type string.');
    }

    // Get data from polkascan to augment it to the rpc block.
    const query = `query { getBlock(filters: { hash: "${hash}" }) { objects { id, countExtrinsics, countEvents },  } }`;
    try {
      const result = await adapter.socket.query(query);
      const block = result.getBlock;
      block.number = parseInt(block.id as any, 10);
      return {block};
    } catch (e) {
      // Ignore failure. We won't augment the block into the rpc fetched block;
      return {};
    }
  };
};
