import '@polkadot/api-augment';
import { TypeRegistry } from '@polkadot/types';
import { ISubmittableResult, Registry } from '@polkadot/types/types';
import { cryptoWaitReady } from "@polkadot/util-crypto";

import loggerMock from '../../mocks/logger';
import { createMockPutWithResult } from '../../mocks/api';
import metricsMock from '../../mocks/metrics';
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
const targetMock = new Target({
  api: apiSuccess,
  logger: loggerMock,
  targetChainUrl,
  metrics: metricsMock,
});
const finalizedBlockNumber = 2;

const defaultRelayParams = {
  logger: loggerMock,
  target: targetMock,
  sourceApi: apiSuccess,
  batchBytesLimit,
  batchCountLimit,
};
const relayWithDefaultParams = new Relay(defaultRelayParams);
const feedId = registry.createType('u64', 10);
const chainName = 'Cool chain' as ChainName;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const setup = async () => {
  await cryptoWaitReady();

  const signer = new PoolSigner(
    registry as unknown as Registry,
    'random account seed',
    1,
  );

  return {
    Target,
    Relay,
    relayWithDefaultParams,
    feedId,
    chainName,
    signer,
    finalizedBlockNumber,
    initialLastProcessedBlock,
    loggerMock,
    targetChainUrl,
    defaultRelayParams,
    batchCountLimit,
  };
}
