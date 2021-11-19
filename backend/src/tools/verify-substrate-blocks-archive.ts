// Small utility that verifies an archive of blocks of Substrate-based chain
// TODO: Types do not seem to match the code, hence usage of it like this
// eslint-disable-next-line @typescript-eslint/no-var-requires
const levelup = require("levelup");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rocksdb = require("rocksdb");

import ChainArchive from "../chainArchive";
import logger from "../logger";

const pathToArchive = process.argv[2];

if (!pathToArchive) {
  console.error('You should specify path to archive as an argument');
  process.exit(1);
}

(async () => {
  const db = levelup(rocksdb(`${pathToArchive}/db`), { readOnly: true });
  const archive = new ChainArchive({
    logger,
    db,
  });

  let lastBlock = -1;
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _block of archive.getBlocks(-1)) {
      lastBlock++;

      if (lastBlock % 1000 === 0) {
        console.log(`Verified block ${lastBlock}`);
      }
    }
  } catch (e) {
    console.error(`Failed to get block ${lastBlock + 1}:`, e);
  }
})();
