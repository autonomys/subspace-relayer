// Small utility that can download blocks from Substrate-based chain starting from genesis and store them by block
// number in a directory

// TODO: Types do not seem to match the code, hence usage of it like this
// eslint-disable-next-line @typescript-eslint/no-var-requires
const levelup = require("levelup");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rocksdb = require("rocksdb");
import pRetry from "p-retry";

import { getLastFinalizedBlock, getBlockByNumber } from '../httpApi';

const REPORT_PROGRESS_INTERVAL = process.env.REPORT_PROGRESS_INTERVAL
  ? parseInt(process.env.REPORT_PROGRESS_INTERVAL, 10)
  : 100;

let shouldStop = false;

process
  .on('SIGINT', () => {
    console.log('Got SIGINT, will stop as soon as possible');
    shouldStop = true;
  })
  .on('SIGTERM', () => {
    console.log('Got SIGTERM, will stop as soon as possible');
    shouldStop = true;
  });

(async () => {
  const sourceChainRpc = process.env.SOURCE_CHAIN_RPC;
  if (!(sourceChainRpc && sourceChainRpc.startsWith('http'))) {
    console.error("SOURCE_CHAIN_RPC environment variable must be set with HTTP RPC URL");
    process.exit(1);
  }

  const targetDir = process.env.TARGET_DIR;
  if (!sourceChainRpc) {
    console.error("TARGET_DIR environment variable must be set with directory where downloaded blocks must be stored");
    process.exit(1);
  }

  console.log("Retrieving last finalized block...");

  const lastFinalizedBlockNumber = await getLastFinalizedBlock(sourceChainRpc);

  console.info(`Last finalized block is ${lastFinalizedBlockNumber}`);

  console.log(`Downloading blocks into ${targetDir}`);

  const db = levelup(rocksdb(`${targetDir}/db`));

  let lastDownloadedBlock;
  try {
    // We know blocks will not exceed 53-bit integer
    lastDownloadedBlock = Number((await db.get('last-downloaded-block') as Buffer).readBigUInt64LE());
  } catch {
    lastDownloadedBlock = -1;
  }

  if (lastDownloadedBlock > -1) {
    console.info(`Continuing downloading from block ${lastDownloadedBlock + 1}`);
  }

  let lastDownloadingReportAt;
  let blockNumber = lastDownloadedBlock + 1;

  for (; blockNumber <= lastFinalizedBlockNumber; ++blockNumber) {
    if (shouldStop) {
      break;
    }
    const [blockHash, blockBytes] = await pRetry(
      () => getBlockByNumber(sourceChainRpc, blockNumber),
    );

    const blockNumberAsBuffer = Buffer.from(BigUint64Array.of(BigInt(blockNumber)).buffer);
    await db.put(
      blockNumberAsBuffer,
      Buffer.concat([
        // Block hash length in bytes
        Buffer.from(Uint8Array.of(32)),
        // Block hash itself
        Buffer.from(blockHash.slice(2), 'hex'),
        // Block bytes in full
        blockBytes,
      ]),
    );
    await db.put('last-downloaded-block', blockNumberAsBuffer);

    if (blockNumber > 0 && blockNumber % REPORT_PROGRESS_INTERVAL === 0) {
      const now = Date.now();
      const downloadRate = lastDownloadingReportAt
        ? ` (${(Number(REPORT_PROGRESS_INTERVAL) / ((now - lastDownloadingReportAt) / 1000)).toFixed(2)} blocks/s)`
        : "";
      lastDownloadingReportAt = now;

      console.info(
        `Downloaded block ${blockNumber}/${lastFinalizedBlockNumber}${downloadRate}`
      );
    }
  }

  if (!shouldStop) {
    console.info("Archived everything");
  }

  await db.close();

  process.exit(0);
})();
