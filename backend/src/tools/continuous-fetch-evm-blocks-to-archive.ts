// Small utility that can continuously fetch blocks from EVM chain and store them in block archive

// TODO: Types do not seem to match the code, hence usage of it like this
// eslint-disable-next-line @typescript-eslint/no-var-requires
const levelup = require("levelup");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rocksdb = require("rocksdb");
import Web3 from 'web3';
import { BlockHeader, BlockTransactionObject } from 'web3-eth';

import { blockNumberToBuffer } from '../utils';
import { PrimaryChainHeadState } from "../chainHeadState";
import logger from "../logger";

// TODO: implement better conversion similar to utils/blockToBinary instead of stringifying JSON
function evmBlockToBinary(block: BlockTransactionObject): Buffer {
  return Buffer.from(JSON.stringify(block), 'utf-8');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchAndStoreEvmBlock(api: Web3, blockNumber: number, db: any): Promise<void> {
  const block = await api.eth.getBlock(blockNumber, true);
  const blockBytes = evmBlockToBinary(block);
  const blockNumberAsBuffer = blockNumberToBuffer(blockNumber);
  const blockHashAsBuffer = Buffer.from(block.hash.slice(2), 'hex');

  await db.put(
    blockNumberAsBuffer,
    Buffer.concat([
      // Block hash length in bytes
      Buffer.from(Uint8Array.of(blockHashAsBuffer.byteLength)),
      // Block hash itself
      blockHashAsBuffer,
      // Block bytes in full
      blockBytes,
    ]),
  );

  await db.put('last-downloaded-block', blockNumberAsBuffer);
}

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

  const api = await new Web3(sourceChainRpc);

  const chainHeadState = new PrimaryChainHeadState(0);

  api.eth.subscribe('newBlockHeaders')
    .on('error', logger.error)
    .on('data', (blockHeader: BlockHeader) => {
      chainHeadState.lastFinalizedBlockNumber = blockHeader.number;
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
      await fetchAndStoreEvmBlock(api, blockNumber, db);

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
