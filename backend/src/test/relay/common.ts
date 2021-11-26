import { TypeRegistry } from '@polkadot/types';
import { ISubmittableResult } from '@polkadot/types/types';
import { cryptoWaitReady } from "@polkadot/util-crypto";

import loggerMock from '../../mocks/logger';
import { HttpApi } from '../../mocks/httpApi';
import { createMockPutWithResult } from '../../mocks/api';
import Relay from "../../relay";
import Target from "../../target";
import { ChainName } from '../../types';
import { PoolSigner } from "../../poolSigner";

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
const httpApiMock = new HttpApi('random url');
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
    loggerMock,
    targetChainUrl,
    defaultRelayParams,
    batchCountLimit
  };
}
