// Small utility that can continuously fetch blocks from Substrate-based chain and store them in block archive

// TODO: Types do not seem to match the code, hence usage of it like this
// eslint-disable-next-line @typescript-eslint/no-var-requires
const levelup = require("levelup");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rocksdb = require("rocksdb");
import { createApi } from '../utils';
import { fetchAndStoreBlock } from './common';
import { PrimaryChainHeadState } from "../chainHeadState";
import logger from "../logger";

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

  const chainHeadState = new PrimaryChainHeadState(0);

  await api.rpc.chain.subscribeFinalizedHeads(async (blockHeader) => {
    chainHeadState.lastFinalizedBlockNumber = blockHeader.number.toNumber();
    if (chainHeadState.newHeadCallback) {
      chainHeadState.newHeadCallback();
      chainHeadState.newHeadCallback = undefined;
    }
  });

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

  let blockNumber = lastDownloadedBlock + 1;

  for (; ;) {
    if (blockNumber <= chainHeadState.lastFinalizedBlockNumber) {
      await fetchAndStoreBlock(api, blockNumber, db);

      logger.debug(`Downloaded block ${blockNumber}/${chainHeadState.lastFinalizedBlockNumber}`);

      blockNumber++;
    }

    await new Promise<void>((resolve) => {
      if (blockNumber <= chainHeadState.lastFinalizedBlockNumber) {
        resolve();
      } else {
        chainHeadState.newHeadCallback = resolve;
      }
    });
  }
})();
