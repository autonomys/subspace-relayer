import * as tap from 'tap';

import ChainArchive from "../chainArchive";
import loggerMock from '../mocks/logger';
import { createDbMock } from '../mocks/db';
import * as signedBlockMock from '../mocks/signedBlock.json';
import { readBlocksInBatches } from "../relay";
import { TxBlock } from '../types';
import { blockToBinary } from '../utils';

tap.test('Relay module', (t) => {
  const blocksMock = [
    blockToBinary(signedBlockMock),
    blockToBinary(signedBlockMock),
    blockToBinary(signedBlockMock),
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
      // we know that blocks in mock + metadata are 123 bytes each
      const bytesLimit = 130;
      const batchesGenerator = readBlocksInBatches(chainArchive, lastProcessedBlock, bytesLimit, countLimit);

      // only one block can fit
      for await (const [blocks] of batchesGenerator) {
        t.equal(blocks.length, 1);
      }
    }

    {
      const bytesLimit = 300;
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
