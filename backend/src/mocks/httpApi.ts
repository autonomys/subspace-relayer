import { HexString } from "@polkadot/util/types";

import { ChainName } from "../types";
import { HttpApi } from '../httpApi';

export const createHttpApiMock = ({ blocks, finalizedBlock }: { blocks: Buffer[], finalizedBlock: number }): HttpApi => ({
  getLastFinalizedBlock(): Promise<number> {
    return Promise.resolve(finalizedBlock);
  },
  getBlockByNumber(_url: string, blockNumber: number): Promise<[HexString, Buffer]> {
    return Promise.resolve(['0xcf5fa8ef2fe76c0d6288535231d21989829933b986d32a3ba452173c5a2074f1', blocks[blockNumber]]);
  },
  getChainName(): Promise<ChainName> {
    return Promise.resolve('Random chain name' as ChainName);
  }
})
