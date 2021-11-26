import { HexString } from "@polkadot/util/types";

import { ChainName } from "../types";
import HttpApiDefault from '../httpApi';
import { blockToBinary } from '../utils';
import * as signedBlockMock from '../mocks/signedBlock.json';

const blocks = [
  blockToBinary(signedBlockMock),
  blockToBinary(signedBlockMock),
  blockToBinary(signedBlockMock),
]

export class HttpApi extends HttpApiDefault {
  getLastFinalizedBlock(): Promise<number> {
    return Promise.resolve(2);
  }

  getBlockByNumber(blockNumber: number): Promise<[HexString, Buffer]> {
    return Promise.resolve(['0xcf5fa8ef2fe76c0d6288535231d21989829933b986d32a3ba452173c5a2074f1', blocks[blockNumber]]);
  }

  getChainName(): Promise<ChainName> {
    return Promise.resolve('Random chain name' as ChainName);
  }
}
