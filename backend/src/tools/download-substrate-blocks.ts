// Small utility that can download blocks from Substrate-based chain starting from genesis and store them by block
// number in a directory. Terminates after reaching last finalized block number

// TODO: Types do not seem to match the code, hence usage of it like this
// eslint-disable-next-line @typescript-eslint/no-var-requires
const levelup = require("levelup");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rocksdb = require("rocksdb");
import logger from "../logger";
import { createApi, blockNumberToBuffer } from '../utils';
import { fetchAndStoreBlock } from './common';

const REPORT_PROGRESS_INTERVAL = process.env.REPORT_PROGRESS_INTERVAL
  ? parseInt(process.env.REPORT_PROGRESS_INTERVAL, 10)
  : 100;

let shouldStop = false;

process
  .on('SIGINT', () => {
    logger.info('Got SIGINT, will stop as soon as possible');
    shouldStop = true;
  })
  .on('SIGTERM', () => {
    logger.info('Got SIGTERM, will stop as soon as possible');
    shouldStop = true;
  });

(async () => {
  const sourceChainRpc = process.env.SOURCE_CHAIN_RPC;
  if (!(sourceChainRpc && sourceChainRpc.startsWith('ws'))) {
    logger.error("SOURCE_CHAIN_RPC environment variable must be set with WS RPC URL");
    process.exit(1);
  }

  const targetDir = process.env.TARGET_DIR;
  if (!sourceChainRpc) {
    logger.error("TARGET_DIR environment variable must be set with directory where downloaded blocks must be stored");
    process.exit(1);
  }

  logger.info("Retrieving last finalized block...");

  const api = await createApi(sourceChainRpc);

  const lastFinalizedHash = await api.rpc.chain.getFinalizedHead();
  const lastFinalizedBlockNumber = (await api.rpc.chain.getHeader(lastFinalizedHash)).number.toNumber();

  logger.info(`Last finalized block is ${lastFinalizedBlockNumber}`);

  logger.info(`Downloading blocks into ${targetDir}`);

  const db = levelup(rocksdb(`${targetDir}/db`));

  let lastDownloadedBlock;
  try {
    // We know blocks will not exceed 53-bit integer
    lastDownloadedBlock = Number((await db.get('last-downloaded-block') as Buffer).readBigUInt64LE());
  } catch {
    lastDownloadedBlock = -1;
  }

  if (lastDownloadedBlock > -1) {
    logger.info(`Continuing downloading from block ${lastDownloadedBlock + 1}`);
  }

  let lastDownloadingReportAt = Date.now();
  let blockNumber = lastDownloadedBlock + 1;

  for (; blockNumber <= lastFinalizedBlockNumber; ++blockNumber) {
    if (shouldStop) {
      break;
    }

    await fetchAndStoreBlock(api, blockNumber, db);

    if (blockNumber > 0 && blockNumber % REPORT_PROGRESS_INTERVAL === 0) {
      const now = Date.now();
      const downloadingRate =
        `(${(Number(REPORT_PROGRESS_INTERVAL) / ((now - lastDownloadingReportAt) / 1000)).toFixed(2)} blocks/s)`;
      lastDownloadingReportAt = now;

      logger.info(
        `Downloaded block ${blockNumber}/${lastFinalizedBlockNumber} ${downloadingRate}`
      );
    }
  }

  if (!shouldStop) {
    logger.info("Archived everything, verifying and fixing up archive if needed");

    blockNumber = 0;

    let lastVerificationReportAt = Date.now();

    for (; blockNumber <= lastFinalizedBlockNumber; ++blockNumber) {
      if (shouldStop) {
        break;
      }

      const blockNumberAsBuffer = blockNumberToBuffer(blockNumber);
      try {
        await db.get(blockNumberAsBuffer);
      } catch (e) {
        logger.info(`Found problematic block ${blockNumber} during archive verification, fixing it`);
        await fetchAndStoreBlock(api, blockNumber, db);
      }

      if (blockNumber > 0 && blockNumber % REPORT_PROGRESS_INTERVAL === 0) {
        const now = Date.now();
        const verificationRate =
          `(${(Number(REPORT_PROGRESS_INTERVAL) / ((now - lastVerificationReportAt) / 1000)).toFixed(2)} blocks/s)`;
        lastVerificationReportAt = now;

        logger.info(
          `Verified block ${blockNumber}/${lastFinalizedBlockNumber} ${verificationRate}`
        );
      }
    }
  }

  await db.close();

  process.exit(0);
})();
