import { U64 } from "@polkadot/types";

import Target from "./target";
import State from "./state";
import { BatchTxBlock, ChainName, SignerWithAddress } from "./types";
import ChainArchive from "./chainArchive";
import logger from "./logger";

// TODO: remove hardcoded url
const polkadotAppsUrl =
  "https://polkadot.js.org/apps/?rpc=ws%3A%2F%2F127.0.0.1%3A9944#/explorer/query/";

async function *readBlocksInBatches(
  archive: ChainArchive,
  lastProcessedBlock: number,
  batchBytesLimit: number,
  batchCountLimit: number,
): AsyncGenerator<[BatchTxBlock[], number], void> {
  let blocksToArchive: BatchTxBlock[] = [];
  let accumulatedBytes = 0;
  let lastBlockNumber = 0;
  for await (const blockData of archive.getBlocks(lastProcessedBlock)) {
    const block = blockData.block;
    const metadata = Buffer.from(JSON.stringify(blockData.metadata), 'utf-8');
    const extraBytes = block.byteLength + metadata.byteLength;

    if (accumulatedBytes + extraBytes >= batchBytesLimit) {
      // With new block limit will be exceeded, yield now
      yield [blocksToArchive, lastBlockNumber];
      blocksToArchive = [];
      accumulatedBytes = 0;
    }

    blocksToArchive.push({
      block: blockData.block,
      metadata,
    });
    accumulatedBytes += extraBytes;
    lastBlockNumber = blockData.metadata.number;

    if (blocksToArchive.length === batchCountLimit) {
      // Reached block count limit, yield now
      yield [blocksToArchive, lastBlockNumber];
      blocksToArchive = [];
      accumulatedBytes = 0;
    }
  }

  if (blocksToArchive.length > 0) {
    yield [blocksToArchive, lastBlockNumber];
  }
}

export async function relayFromDownloadedArchive(
  feedId: U64,
  chainName: ChainName,
  path: string,
  target: Target,
  state: State,
  signer: SignerWithAddress,
  batchBytesLimit: number,
  batchCountLimit: number,
): Promise<number> {
  const archive = new ChainArchive({
    path,
    logger,
  });

  let lastBlockProcessingReportAt = Date.now();

  let nonce = (await target.api.rpc.system.accountNextIndex(signer.address)).toBigInt();
  const lastProcessedString = await state.getLastProcessedBlockByName(chainName);
  let lastProcessedBlock = lastProcessedString ? parseInt(lastProcessedString, 10) : 0;

  let lastTxPromise: Promise<void> | undefined;
  const blockBatches = readBlocksInBatches(archive, lastProcessedBlock, batchBytesLimit, batchCountLimit);
  for await (const [blocksBatch, lastBlockNumber] of blockBatches) {
    if (lastTxPromise) {
      await lastTxPromise;
    }
    lastTxPromise = (async () => {
      const blockHash = await target.sendBlocksBatchTx(feedId, signer, blocksBatch, nonce);
      nonce++;

      logger.debug(`Transaction included: ${polkadotAppsUrl}${blockHash}`);

      {
        const now = Date.now();
        const rate = (blocksBatch.length / ((now - lastBlockProcessingReportAt) / 1000)).toFixed(2);
        lastBlockProcessingReportAt = now;

        logger.info(`Processed downloaded ${chainName} block ${lastBlockNumber} at ${rate} blocks/s`);
      }

      lastProcessedBlock = lastBlockNumber;
      await state.saveLastProcessedBlock(chainName, lastProcessedBlock);
    })();
  }

  return lastProcessedBlock;
}
