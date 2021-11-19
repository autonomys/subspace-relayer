import * as tap from 'tap';

import ChainArchive from "../chainArchive";
import loggerMock from '../mocks/logger';
import { createDbMock } from '../mocks/db';
import { readBlocksInBatches } from "../relay";
import { TxBlock } from '../types';

tap.test('Relay module', (t) => {
  // TODO: use real block buffers
  const blocksMock = [
    Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]),
    Buffer.from([2, 3, 4, 5, 6, 7, 8, 9]),
    Buffer.from([3, 4, 5, 6, 7, 8, 9, 10]),
  ]
  const dbMock = createDbMock(blocksMock);
  const chainArchive = new ChainArchive({ logger: loggerMock, db: dbMock });
  const lastProcessedBlock = 0;
  const bytesLimit = 3_500_000;
  const countLimit = 2;

  tap.test('readBlocksInBatches method should return AsyncGenerator with batch of TxBlock items and last block number', async (t) => {
    const batchesGenerator = readBlocksInBatches(chainArchive, lastProcessedBlock, bytesLimit, countLimit);

    for await (const [blocks, lastBlockNumber] of batchesGenerator) {
      t.ok(blocks.length <= countLimit);
      t.type(blocks[0].block, Buffer);
      t.type(blocks[0].metadata, Buffer);
      // should be greater than zero if batch has items
      t.ok(lastBlockNumber);
    }
  });

  tap.test('readBlocksInBatches should yield last block number equal to the block number of the last block in the batch', async (t) => {
    const batchesGenerator = readBlocksInBatches(chainArchive, lastProcessedBlock, bytesLimit, countLimit);

    {
      const first = await batchesGenerator.next();
      t.notOk(first.done);
      const [blocks, number] = (first.value as [TxBlock[], number]);
      // total number of blocks is 3, batch count limit is 2 - we expect 2 blocks
      t.equal(blocks.length, 2);
      t.equal(number, 2);
    }

    {
      const second = await batchesGenerator.next();
      t.notOk(second.done);
      const [blocks, number] = (second.value as [TxBlock[], number]);
      // 1 out of 3 blocks left
      t.equal(blocks.length, 1);
      t.equal(number, 3);
    }

    // no more blocks in archive
    const third = await batchesGenerator.next();
    t.ok(third.done);
    t.notOk(third.value);
  });

  tap.test('readBlocksInBatches should fit maximum number of blocks within size limit', async (t) => {
    {
      // TODO: update this after when using mocks with real block buffers
      // current block buffer + metadata usually has 32-34 bytes
      const bytesLimit = 35;
      const batchesGenerator = readBlocksInBatches(chainArchive, lastProcessedBlock, bytesLimit, countLimit);

      // only one block can fit
      for await (const [blocks] of batchesGenerator) {
        t.equal(blocks.length, 1);
      }
    }

    {
      const bytesLimit = 70;
      const batchesGenerator = readBlocksInBatches(chainArchive, lastProcessedBlock, bytesLimit, countLimit);

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


  t.end();
})
