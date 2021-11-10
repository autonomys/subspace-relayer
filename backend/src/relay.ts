import { U64 } from "@polkadot/types";
import pRetry from "p-retry";

import Target from "./target";
import State from "./state";
import { BatchTxBlock, ChainName, SignerWithAddress } from "./types";
import ChainArchive from "./chainArchive";
import logger from "./logger";
import { getBlockByNumber, getLastFinalizedBlock } from "./httpApi";
import { AnyChainConfig } from "./config";
import { ParachainHeadState, PrimaryChainHeadState } from "./chainHeadState";

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

interface RelayBlocksResult {
  nonce: bigint;
  nextBlockToProcess: number;
}

async function relayBlocks(
  feedId: U64,
  chainName: ChainName,
  target: Target,
  state: State,
  signer: SignerWithAddress,
  chainConfig: AnyChainConfig,
  nonce: bigint,
  nextBlockToProcess: number,
  lastFinalizedBlockNumber: () => number,
): Promise<RelayBlocksResult> {
  // TODO: Support batching
  for (; nextBlockToProcess <= lastFinalizedBlockNumber(); nextBlockToProcess++) {
    // TODO: Cache of mapping from block number to its hash for faster fetching
    const [blockHash, block] = await pRetry(
      () => getBlockByNumber(chainConfig.httpUrl, nextBlockToProcess),
    );
    await target.sendBlockTx({
      feedId,
      block,
      metadata: {
        hash: blockHash,
        number: nextBlockToProcess,
      },
      chainName,
      signer,
      nonce,
    });
    nonce++;

    await state.saveLastProcessedBlock(chainName, nextBlockToProcess);
  }

  return {
    nonce,
    nextBlockToProcess,
  };
}

export async function relayFromPrimaryChainHeadState(
  feedId: U64,
  chainName: ChainName,
  target: Target,
  state: State,
  signer: SignerWithAddress,
  chainHeadState: PrimaryChainHeadState,
  chainConfig: AnyChainConfig,
  lastProcessedBlock: number,
): Promise<void> {
  let nextBlockToProcess = lastProcessedBlock + 1;
  let nonce = (await target.api.rpc.system.accountNextIndex(signer.address)).toBigInt();
  for (;;) {
    const result = await relayBlocks(
      feedId,
      chainName,
      target,
      state,
      signer,
      chainConfig,
      nonce,
      nextBlockToProcess,
      () => {
        return chainHeadState.lastFinalizedBlockNumber;
      }
    );
    nonce = result.nonce;
    nextBlockToProcess = result.nextBlockToProcess;

    await new Promise<void>((resolve) => {
      if (nextBlockToProcess <= chainHeadState.lastFinalizedBlockNumber) {
        resolve();
      } else {
        chainHeadState.newHeadCallback = resolve;
      }
    });
  }
}

export async function relayFromParachainHeadState(
  feedId: U64,
  chainName: ChainName,
  target: Target,
  state: State,
  signer: SignerWithAddress,
  chainHeadState: ParachainHeadState,
  chainConfig: AnyChainConfig,
  lastProcessedBlock: number,
): Promise<void> {
  let nextBlockToProcess = lastProcessedBlock + 1;
  let nonce = (await target.api.rpc.system.accountNextIndex(signer.address)).toBigInt();
  for (;;) {
    // TODO: This is simple, but not very efficient
    const lastFinalizedBlockNumber = await pRetry(
      () => getLastFinalizedBlock(chainConfig.httpUrl),
    );
    const result = await relayBlocks(
      feedId,
      chainName,
      target,
      state,
      signer,
      chainConfig,
      nonce,
      nextBlockToProcess,
      () => {
        return lastFinalizedBlockNumber;
      }
    );
    nonce = result.nonce;
    nextBlockToProcess = result.nextBlockToProcess;

    await new Promise<void>((resolve) => {
      chainHeadState.newHeadCallback = resolve;
    });
  }
}
