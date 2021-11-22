import * as tap from 'tap';

import { TxBlock } from '../../types';
import { setup } from './common';

tap.test('Relay module - readBlocksInBatches method', async (t) => {
  const {
    initialLastProcessedBlock,
    chainArchive,
    Relay,
    defaultRelayParams,
    batchCountLimit,
  } = await setup();

  tap.test('should return AsyncGenerator with batch of TxBlock items and last block number', async (t) => {
    const relay = new Relay({ ...defaultRelayParams, archive: chainArchive });

    const batchesGenerator = relay['readBlocksInBatches'](initialLastProcessedBlock);

    for await (const [blocks, lastBlockNumber] of batchesGenerator) {
      t.ok(blocks.length <= batchCountLimit);
      t.type(blocks[0].block, Buffer);
      t.type(blocks[0].metadata, Buffer);
      // should be greater than zero if batch has items
      t.ok(lastBlockNumber);
    }
  });

  tap.test('should yield last block number equal to the block number of the last block in the batch', async (t) => {
    const relay = new Relay({ ...defaultRelayParams, archive: chainArchive });

    const batchesGenerator = relay['readBlocksInBatches'](initialLastProcessedBlock);

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

  tap.test('should fit maximum number of blocks within size limit', async (t) => {
    {
      // we know that blocks in mock + metadata are 123 bytes each
      const batchBytesLimit = 130;
      const relay = new Relay({
        ...defaultRelayParams,
        batchBytesLimit,
        archive: chainArchive,
      });
      const batchesGenerator = relay['readBlocksInBatches'](initialLastProcessedBlock);

      // only one block can fit
      for await (const [blocks] of batchesGenerator) {
        t.equal(blocks.length, 1);
      }
    }

    {
      const batchBytesLimit = 300;
      const relay = new Relay({
        ...defaultRelayParams,
        batchBytesLimit,
        archive: chainArchive,
      });
      const batchesGenerator = relay['readBlocksInBatches'](initialLastProcessedBlock);

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
