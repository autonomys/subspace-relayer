import * as tap from 'tap';
import { TypeRegistry } from '@polkadot/types';
import { ISubmittableResult } from '@polkadot/types/types';

import Target from "../target";
import logger from '../mocks/logger';
import { createMockPutWithResult } from '../mocks/api';
import { ChainName, SignerWithAddress } from '../types';

tap.test('Target module', (t) => {
  const targetChainUrl = 'random url';
  const registry = new TypeRegistry();
  const feedId = registry.createType('U64', 0);
  const chainName = 'random chain' as ChainName;
  const signer = { address: 'random signer address' } as SignerWithAddress;
  const txBlock = {
    block: Buffer.from([]),
    metadata: Buffer.from([]),
  }
  const nonce = BigInt(0);
  const txBatch = [txBlock, txBlock];

  const putSuccessResult = {
    isError: false,
    status: {
      isInBlock: true,
      asInBlock: 'random hash'
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
    const target = new Target({ api: apiSuccess, logger, targetChainUrl });

    const hash = await target.sendBlockTx(feedId, chainName, signer, txBlock, nonce);

    t.equal(hash, putSuccessResult.status.asInBlock);
  });

  tap.test('sendBlockTx should reject if polkadot.js API throws error', async (t) => {
    const target = new Target({ api: apiFailure, logger, targetChainUrl });

    t.rejects(target.sendBlockTx(feedId, chainName, signer, txBlock, nonce));
  });

  tap.test('sendBlocksBatchTx should successfully send batch of transactions and resolve hash', async (t) => {
    const target = new Target({ api: apiSuccess, logger, targetChainUrl });

    const hash = await target.sendBlocksBatchTx(feedId, chainName, signer, txBatch, nonce);

    t.equal(hash, putSuccessResult.status.asInBlock);
  });

  tap.test('sendBlocksBatchTx should reject if polkadot.js API throws error', async (t) => {
    const target = new Target({ api: apiFailure, logger, targetChainUrl });

    t.rejects(target.sendBlocksBatchTx(feedId, chainName, signer, txBatch, nonce));
  });

  t.end();
})
