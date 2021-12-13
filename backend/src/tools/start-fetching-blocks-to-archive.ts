// Small utility that can continuously fetch blocks from Substrate-based chain and store them in block archive

// TODO: Types do not seem to match the code, hence usage of it like this
// eslint-disable-next-line @typescript-eslint/no-var-requires
const levelup = require("levelup");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rocksdb = require("rocksdb");
import pRetry from "p-retry";
import { createApi } from '../utils';
import { fetchAndStoreBlock } from './common';

const retryOptions = {
  randomize: true,
  forever: true,
  minTimeout: 1000,
  maxTimeout: 60 * 60 * 1000,
};

(async () => {
  const sourceChainRpc = process.env.SOURCE_CHAIN_RPC;
  if (!(sourceChainRpc && sourceChainRpc.startsWith('ws'))) {
    console.error("SOURCE_CHAIN_RPC environment variable must be set with WS RPC URL");
    process.exit(1);
  }

  const targetDir = process.env.TARGET_DIR;
  if (!sourceChainRpc) {
    console.error("TARGET_DIR environment variable must be set with directory where downloaded blocks must be stored");
    process.exit(1);
  }

  console.log("Retrieving last finalized block...");

  const api = await createApi(sourceChainRpc);

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

  let blockNumber = lastDownloadedBlock + 1;

  for (; ;) {
    const lastFinalizedHash = await pRetry(
      () => api.rpc.chain.getFinalizedHead(),
      retryOptions,
    );

    const lastFinalizedBlockNumber = (await pRetry(
      () => api.rpc.chain.getHeader(lastFinalizedHash),
      retryOptions,
    )).number.toNumber();

    if (blockNumber <= lastFinalizedBlockNumber) {
      await fetchAndStoreBlock(api, blockNumber, db);

      console.info(`Downloaded block ${blockNumber}/${lastFinalizedBlockNumber}`);

      blockNumber++;
    }
  }
})();
