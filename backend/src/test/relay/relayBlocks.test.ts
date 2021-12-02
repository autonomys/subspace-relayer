import * as tap from 'tap';

import { setup } from './common';

tap.test('Relay module - relayBlocks method', async (t) => {
  const { relayWithDefaultParams, finalizedBlockNumber, feedId, chainName, signer } = await setup();

  tap.test('should return nonce and next block to process', async (t) => {
    const nonce = BigInt(0);
    const nextBlockToProcess = 0;
    const lastFinalizedBlockNumber = () => finalizedBlockNumber;

    const result = await relayWithDefaultParams['relayBlocks'](feedId, chainName, signer, nonce, nextBlockToProcess, lastFinalizedBlockNumber);

    // total 3 blocks to process, batch count limit is 2, therefore we have two transactions (2 and 1 block in each batch)
    t.same(result, { nonce: BigInt(2), nextBlockToProcess: 3 });
  });

  tap.test('should retry if sending transaction fails');

  tap.test('should increase nonce if sending transaction fails in case error is caused by nonce used by other transaction');

  t.end();
})
