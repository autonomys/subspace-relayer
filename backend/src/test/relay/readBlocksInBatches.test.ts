import * as tap from 'tap';

import { TxBlock } from '../../types';
import { setup } from './common';

tap.test('Relay module - readBlocksInBatches method', async (t) => {
  const {
    relayWithDefaultParams,
    initialLastProcessedBlock,
    chainArchiveMock,
    Relay,
    defaultRelayParams,
    batchCountLimit,
  } = await setup();

  tap.test('should yield last block number equal to the block number of the last block in the batch', async (t) => {
    const batchesGenerator = relayWithDefaultParams['readBlocksInBatches'](initialLastProcessedBlock, chainArchiveMock);

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

    // no more blocks in chainArchive
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
        batchCountLimit,
      });

      const batchesGenerator = relay['readBlocksInBatches'](initialLastProcessedBlock, chainArchiveMock);

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
        batchCountLimit,
      });

      const batchesGenerator = relay['readBlocksInBatches'](initialLastProcessedBlock, chainArchiveMock);

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
