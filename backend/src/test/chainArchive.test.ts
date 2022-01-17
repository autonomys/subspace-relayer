import * as tap from 'tap';
import '@polkadot/api-augment';
// TODO: Types do not seem to match the code, hence usage of it like this
// eslint-disable-next-line @typescript-eslint/no-var-requires
const levelup = require("levelup");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rocksdb = require("rocksdb");
import * as fsp from 'fs/promises';

import ChainArchive, { ArchivedBlock } from "../chainArchive";
import loggerMock from '../mocks/logger';
import * as signedBlockMock from '../mocks/signedBlock.json';
import { blockToBinary, blockNumberToBuffer } from '../utils';

const populateDb = async (path: string) => {
  await fsp.mkdir(path);
  const db = levelup(rocksdb(`${path}/db`));
  await db.put(blockNumberToBuffer(1), blockToBinary(signedBlockMock));
  await db.put(blockNumberToBuffer(2), blockToBinary(signedBlockMock));
  await db.put(blockNumberToBuffer(3), blockToBinary(signedBlockMock));
  await db.put('last-downloaded-block', blockNumberToBuffer(3));
  await db.close();
}

const tearDown = async (path: string) => {
  const db = levelup(rocksdb(`${path}/db`));
  await db.open();
  await db.clear();
  await db.close();
  await fsp.rm(path, { recursive: true });
}

tap.test('ChainArchive module', (t) => {
  tap.test('getBlocks method should return AsyncGenerator with ArchivedBlocks', async (t) => {
    const path = 'testDb1';

    await populateDb(path);

    const chainArchive = new ChainArchive({ logger: loggerMock, path });

    for await (const blockData of chainArchive.getBlocks(0)) {
      t.type(blockData, ArchivedBlock);
    }

    await tearDown(path);
  })

  tap.test('getBlocks should maintain block numbers sequence', async (t) => {
    const path = 'testDb2';

    await populateDb(path);

    const chainArchive = new ChainArchive({ logger: loggerMock, path });
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

    await tearDown(path);
  })

  t.end();
});

