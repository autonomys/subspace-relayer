import * as tap from 'tap';

import { TxBlock } from '../../types';
import { setup } from './common';

tap.test('Relay module - fetchBlocksInBatches method', async (t) => {
  const {
    Relay,
    defaultRelayParams,
    batchCountLimit,
    finalizedBlockNumber,
    relay,
  } = await setup();

  const httpUrl = 'random url';
  const nextBlockToProcess = 0;
  const lastFinalizedBlockNumber = () => finalizedBlockNumber;

  tap.test('should return AsyncGenerator with batch of TxBlock items and next block number', async (t) => {
    const batchesGenerator = relay['fetchBlocksInBatches'](
      httpUrl,
      nextBlockToProcess,
      lastFinalizedBlockNumber,
    );

    for await (const [blocks, lastBlockNumber] of batchesGenerator) {
      t.ok(blocks.length <= batchCountLimit);
      t.type(blocks[0].block, Buffer);
      t.type(blocks[0].metadata, Buffer);
      // should be greater than zero if batch has items
      t.ok(lastBlockNumber);
    }
  });

  tap.test('should yield block number next to the block number of the block in the batch', async (t) => {
    const batchesGenerator = relay['fetchBlocksInBatches'](
      httpUrl,
      nextBlockToProcess,
      lastFinalizedBlockNumber,
    );

    {
      const first = await batchesGenerator.next();
      t.notOk(first.done);
      const [blocks, nextBlockNumber] = (first.value as [TxBlock[], number]);
      // total number of blocks is 3, batch count limit is 2 - we expect 2 blocks
      t.equal(blocks.length, 2);
      // TODO: clarify why is not 2
      t.equal(nextBlockNumber, 1);
    }

    {
      const second = await batchesGenerator.next();
      t.notOk(second.done);
      const [blocks, nextBlockNumber] = (second.value as [TxBlock[], number]);
      // 1 out of 3 blocks left
      t.equal(blocks.length, 1);
      t.equal(nextBlockNumber, 3);
    }

    // no more blocks to fetch
    const third = await batchesGenerator.next();
    t.ok(third.done);
    t.notOk(third.value);
  });

  tap.test('should fit maximum number of blocks within size limit', async (t) => {
    {
      // we know that blocks in mock + metadata are 188 bytes each
      const batchBytesLimit = 200;
      const relay = new Relay({
        ...defaultRelayParams,
        batchBytesLimit,
      });

      const batchesGenerator = relay['fetchBlocksInBatches'](
        httpUrl,
        nextBlockToProcess,
        lastFinalizedBlockNumber,
      );

      // only one block can fit
      for await (const [blocks] of batchesGenerator) {
        t.equal(blocks.length, 1);
      }
    }

    {
      const batchBytesLimit = 400;
      const relay = new Relay({
        ...defaultRelayParams,
        batchBytesLimit,
      });
      const httpUrl = 'random url';
      const nextBlockToProcess = 0;
      const lastFinalizedBlockNumber = () => finalizedBlockNumber;

      const batchesGenerator = relay['fetchBlocksInBatches'](
        httpUrl,
        nextBlockToProcess,
        lastFinalizedBlockNumber,
      );

      const first = await batchesGenerator.next();
      t.notOk(first.done);
      const [firstBatch] = (first.value as [TxBlock[], number]);
      // two blocks can fit
      t.equal(firstBatch.length, 2);

      const second = await batchesGenerator.next();
      t.notOk(second.done);
      const [secondBatch] = (second.value as [TxBlock[], number]);
      // only one block left
      t.equal(secondBatch.length, 1);
    }
  });

  tap.test('should retry if get block over HTTP API fails');

  t.end();
})
