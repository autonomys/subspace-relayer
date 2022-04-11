import * as tap from 'tap';
import '@polkadot/api-augment';
import { TypeRegistry } from '@polkadot/types';
import { ISubmittableResult } from '@polkadot/types/types';

import Target from "../target";
import logger from '../mocks/logger';
import metricsMock from '../mocks/metrics';
import { createMockPutWithResult } from '../mocks/api';
import { ChainName, SignerWithAddress } from '../types';
import * as signedBlockMock from '../mocks/signedBlock.json';
import { blockToBinary } from '../utils';

tap.test('Target module', (t) => {
  const targetChainUrl = 'random url';
  const registry = new TypeRegistry();
  const feedId = registry.createType('U64', 0);
  const chainName = 'random chain' as ChainName;
  const signer = { address: 'random signer address' } as SignerWithAddress;
  const txBlock = blockToBinary(signedBlockMock);
  const nonce = BigInt(0);
  const txBatch = [txBlock, txBlock];

  const putSuccessResult = {
    isError: false,
    status: {
      isInBlock: true,
      asInBlock: registry.createType('Hash', '0xde8f69eeb5e065e18c6950ff708d7e551f68dc9bf59a07c52367c0280f805ec7'),
    }
  } as unknown as ISubmittableResult;

  const putFailureResult = {
    isError: true,
    status: {
      isInvalid: true
    }
  } as unknown as ISubmittableResult;

  const apiSuccess = createMockPutWithResult(putSuccessResult);
  const apiFailure = createMockPutWithResult(putFailureResult);

  tap.test('sendBlockTx should successfully send block transaction and resolve hash', async (t) => {
    const target = new Target({
      api: apiSuccess,
      logger,
      targetChainUrl,
      metrics: metricsMock,
    });

    const hash = await target.sendBlockTx(feedId, chainName, signer, txBlock, nonce);

    t.equal(hash, putSuccessResult.status.asInBlock);
  });

  tap.test('sendBlockTx should reject if polkadot.js API throws error', async (t) => {
    const target = new Target({
      api: apiFailure,
      logger, targetChainUrl,
      metrics: metricsMock,
    });

    t.rejects(target.sendBlockTx(feedId, chainName, signer, txBlock, nonce));
  });

  tap.test('sendBlocksBatchTx should successfully send batch of transactions and resolve hash', async (t) => {
    const target = new Target({
      api: apiSuccess,
      logger,
      targetChainUrl,
      metrics: metricsMock,
    });

    const hash = await target.sendBlocksBatchTx(feedId, chainName, signer, txBatch, nonce);

    t.equal(hash, putSuccessResult.status.asInBlock);
  });

  tap.test('sendBlocksBatchTx should reject if polkadot.js API throws error', async (t) => {
    const target = new Target({
      api: apiFailure,
      logger,
      targetChainUrl,
      metrics: metricsMock,
    });

    t.rejects(target.sendBlocksBatchTx(feedId, chainName, signer, txBatch, nonce));
  });

  t.end();
})
