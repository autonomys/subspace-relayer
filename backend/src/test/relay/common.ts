import { TypeRegistry } from '@polkadot/types';
import { ISubmittableResult } from '@polkadot/types/types';
import { cryptoWaitReady } from "@polkadot/util-crypto";

import loggerMock from '../../mocks/logger';
import * as signedBlockMock from '../../mocks/signedBlock.json';
import { createHttpApiMock } from '../../mocks/httpApi';
import { createDbMock } from '../../mocks/db';
import Relay from "../../relay";
import Target from "../../target";
import { ChainName } from '../../types';
import { blockToBinary } from '../../utils';
import { createMockPutWithResult } from '../../mocks/api';
import { PoolSigner } from "../../poolSigner";
import ChainArchive from "../../chainArchive";

const blocksMock = [
  blockToBinary(signedBlockMock),
  blockToBinary(signedBlockMock),
  blockToBinary(signedBlockMock),
]

const dbMock = createDbMock(blocksMock);
const chainArchive = new ChainArchive({ logger: loggerMock, db: dbMock });
const initialLastProcessedBlock = 0;
const batchBytesLimit = 3_500_000;
const batchCountLimit = 2;
const targetChainUrl = 'random url';
const registry = new TypeRegistry();
const putSuccessResult = {
  isError: false,
  status: {
    isInBlock: true,
    asInBlock: registry.createType('Hash', '0xde8f69eeb5e065e18c6950ff708d7e551f68dc9bf59a07c52367c0280f805ec7'),
  }
} as unknown as ISubmittableResult;
const apiSuccess = createMockPutWithResult(putSuccessResult);
const targetMock = new Target({ api: apiSuccess, logger: loggerMock, targetChainUrl });
const finalizedBlockNumber = 2;
const httpApiMock = createHttpApiMock({
  blocks: blocksMock,
  finalizedBlock: finalizedBlockNumber,
})
const defaultRelayParams = {
  logger: loggerMock,
  target: targetMock,
  httpApi: httpApiMock,
  batchBytesLimit,
  batchCountLimit,
};
const relay = new Relay(defaultRelayParams);
const feedId = registry.createType('u64', 10);
const chainName = 'Cool chain' as ChainName;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const setup = async () => {
  await cryptoWaitReady();

  const signer = new PoolSigner(
    registry,
    'random account seed',
    1,
  );

  return {
    Target,
    Relay,
    relay,
    feedId,
    chainName,
    signer,
    finalizedBlockNumber,
    initialLastProcessedBlock,
    chainArchive,
    blocksMock,
    loggerMock,
    targetChainUrl,
    defaultRelayParams,
    batchCountLimit
  };
}
