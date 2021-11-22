import { HexString } from "@polkadot/util/types";

import { ChainName } from "../types";
import { HttpApi } from '../httpApi';

export const createHttpApiMock = ({ blocks, finalizedBlock }: { blocks: Buffer[], finalizedBlock: number }): HttpApi => ({
  getLastFinalizedBlock(): Promise<number> {
    return Promise.resolve(finalizedBlock);
  },
  getBlockByNumber(_url: string, blockNumber: number): Promise<[HexString, Buffer]> {
    // TODO: use real hex
    return Promise.resolve(['0xblockhex', blocks[blockNumber]]);
  },
  getChainName(): Promise<ChainName> {
    return Promise.resolve('Random chain name' as ChainName);
  }
})
