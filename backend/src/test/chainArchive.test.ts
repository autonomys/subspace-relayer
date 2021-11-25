import * as tap from 'tap';

// import ChainArchive, { ArchivedBlock } from "../chainArchive";
// import loggerMock from '../mocks/logger';

// TODO: update tests after refactoring
tap.test('ChainArchive module', (t) => {
  // const dbMock = {
  //   get(query: string | number) {
  //     if (query === 'last-downloaded-block') {
  //       // last downloaded block number is 3
  //       const buf = Buffer.alloc(8);
  //       buf.writeUInt8(0x3, 0);
  //       return buf;
  //     }

  //     // random Buffer
  //     return Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  //   }
  // }
  // const chainArchive = new ChainArchive({ logger: loggerMock, db: dbMock });

  tap.test('getBlocks method should return AsyncGenerator with ArchivedBlocks', async (t) => {
    //   for await (const blockData of chainArchive.getBlocks(0)) {
    //     t.type(blockData, ArchivedBlock);
    //   }

    t.end();
  })

  tap.test('getBlocks should maintain block numbers sequence', async (t) => {
    //   const blockGenerator = chainArchive.getBlocks(0);

    //   const firstBlock = await blockGenerator.next();
    //   t.notOk(firstBlock.done);
    //   t.equal((firstBlock.value as ArchivedBlock).metadata.number, 1);

    //   const secondBlock = await blockGenerator.next();
    //   t.notOk(secondBlock.done);
    //   t.equal((secondBlock.value as ArchivedBlock).metadata.number, 2);

    //   const thirdBlock = await blockGenerator.next();
    //   t.notOk(thirdBlock.done);
    //   t.equal((thirdBlock.value as ArchivedBlock).metadata.number, 3);

    //   const fourthBlock = await blockGenerator.next();
    //   t.ok(fourthBlock.done);
    //   t.notOk(fourthBlock.value);

    t.end();
  })

  t.end();
})
