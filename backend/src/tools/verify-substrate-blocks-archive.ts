// Small utility that verifies an archive of blocks of Substrate-based chain
import ChainArchive from "../chainArchive";
import logger from "../logger";

const pathToArchive = process.argv[2];

if (!pathToArchive) {
  logger.error('You should specify path to archive as an argument');
  process.exit(1);
}

(async () => {
  const archive = new ChainArchive({
    logger,
    path: pathToArchive,
  });

  let lastBlock = -1;
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _block of archive.getBlocks(-1)) {
      lastBlock++;

      if (lastBlock % 1000 === 0) {
        logger.info(`Verified block ${lastBlock}`);
      }
    }
  } catch (e) {
    logger.error(`Failed to get block ${lastBlock + 1}:`, e);
  }
})();
