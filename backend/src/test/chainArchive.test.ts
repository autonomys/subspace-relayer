import * as tap from 'tap';

import ChainArchive, { ArchivedBlock } from "../chainArchive";
import loggerMock from '../mocks/logger';
import { createDbMock } from '../mocks/db';

tap.test('ChainArchive module', (t) => {
  const blocks = [
    Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]),
    Buffer.from([2, 3, 4, 5, 6, 7, 8, 9]),
    Buffer.from([3, 4, 5, 6, 7, 8, 9, 10]),
  ]
  const dbMock = createDbMock(blocks);
  const chainArchive = new ChainArchive({ logger: loggerMock, db: dbMock });

  tap.test('getBlocks method should return AsyncGenerator with ArchivedBlocks', async (t) => {
    for await (const blockData of chainArchive.getBlocks(0)) {
      t.type(blockData, ArchivedBlock);
    }
  })

  tap.test('getBlocks should maintain block numbers sequence', async (t) => {
    const blockGenerator = chainArchive.getBlocks(0);

    const firstBlock = await blockGenerator.next();
    t.notOk(firstBlock.done);
    t.equal((firstBlock.value as ArchivedBlock).metadata.number, 1);

    const secondBlock = await blockGenerator.next();
    t.notOk(secondBlock.done);
    t.equal((secondBlock.value as ArchivedBlock).metadata.number, 2);

    const thirdBlock = await blockGenerator.next();
    t.notOk(thirdBlock.done);
    t.equal((thirdBlock.value as ArchivedBlock).metadata.number, 3);

    const fourthBlock = await blockGenerator.next();
    t.ok(fourthBlock.done);
    t.notOk(fourthBlock.value);
  })

  t.end();
})
