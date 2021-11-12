import { U64 } from "@polkadot/types";
import pRetry from "p-retry";

import Target from "./target";
import { TxBlock, ChainName, SignerWithAddress } from "./types";
import ChainArchive from "./chainArchive";
import logger from "./logger";
import { getBlockByNumber, getLastFinalizedBlock } from "./httpApi";
import { AnyChainConfig } from "./config";
import { ParachainHeadState, PrimaryChainHeadState } from "./chainHeadState";

function polkadotAppsUrl(targetChainUrl: string) {
  const url = new URL('https://polkadot.js.org/apps/');
  url.searchParams.set('rpc', targetChainUrl);
  url.hash = '/explorer/query/'
  return url.toString();
}

async function* readBlocksInBatches(
  archive: ChainArchive,
  lastProcessedBlock: number,
  batchBytesLimit: number,
  batchCountLimit: number,
): AsyncGenerator<[TxBlock[], number], void> {
  let blocksToArchive: TxBlock[] = [];
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

    blocksToArchive.push({ block, metadata });
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
  lastProcessedBlock: number,
  signer: SignerWithAddress,
  batchBytesLimit: number,
  batchCountLimit: number,
): Promise<number> {
  const polkadotAppsBaseUrl = polkadotAppsUrl(target.targetChainUrl);
  const archive = new ChainArchive({
    path,
    logger,
  });

  let lastBlockProcessingReportAt = Date.now();

  let nonce = (await target.api.rpc.system.accountNextIndex(signer.address)).toBigInt();

  let lastTxPromise: Promise<void> | undefined;
  const blockBatches = readBlocksInBatches(archive, lastProcessedBlock, batchBytesLimit, batchCountLimit);
  for await (const [blocksToArchive, lastBlockNumber] of blockBatches) {
    if (lastTxPromise) {
      await lastTxPromise;
    }
    lastTxPromise = (async () => {
      const blockHash = await pRetry(
        () => target
          .sendBlocksBatchTx(feedId, chainName, signer, blocksToArchive, nonce)
          .catch((e) => {
            // Increase nonce in case error is caused by nonce used by other transaction
            nonce++;
            throw e;
          }),
      );
      nonce++;

      logger.debug(
        `Transaction included with ${blocksToArchive.length} ${chainName} blocks: ${polkadotAppsBaseUrl}${blockHash}`,
      );

      {
        const now = Date.now();
        const rate = (blocksToArchive.length / ((now - lastBlockProcessingReportAt) / 1000)).toFixed(2);
        lastBlockProcessingReportAt = now;

        logger.info(`Processed downloaded ${chainName} block ${lastBlockNumber} at ${rate} blocks/s`);
      }

      lastProcessedBlock = lastBlockNumber;
    })();

    lastTxPromise.catch(() => {
      // This is just to prevent uncaught promise rejection due to promise being stored in a variable
    });
  }

  if (lastTxPromise) {
    await lastTxPromise;
  }

  return lastProcessedBlock;
}

interface RelayBlocksResult {
  nonce: bigint;
  nextBlockToProcess: number;
}

async function* fetchBlocksInBatches(
  httpUrl: string,
  nextBlockToProcess: number,
  lastFinalizedBlockNumber: () => number,
  batchBytesLimit: number,
  batchCountLimit: number,
): AsyncGenerator<[TxBlock[], number], void> {
  let blocksToArchive: TxBlock[] = [];
  let accumulatedBytes = 0;
  for (; nextBlockToProcess <= lastFinalizedBlockNumber(); nextBlockToProcess++) {
    // TODO: Cache of mapping from block number to its hash for faster fetching
    const [blockHash, block] = await pRetry(
      () => getBlockByNumber(httpUrl, nextBlockToProcess),
      {
        forever: true,
        minTimeout: 1000,
        maxTimeout: 60 * 60 * 1000,
        onFailedAttempt: error => logger.error(error, "getBlockByNumber retry error: "),
      },
    );
    const metadata = Buffer.from(
      JSON.stringify({
        hash: blockHash,
        number: nextBlockToProcess,
      }),
      'utf-8',
    );
    const extraBytes = block.byteLength + metadata.byteLength;
    if (accumulatedBytes + extraBytes >= batchBytesLimit) {
      // With new block limit will be exceeded, yield now
      yield [blocksToArchive, nextBlockToProcess];
      blocksToArchive = [];
      accumulatedBytes = 0;
    }

    blocksToArchive.push({ block, metadata });
    accumulatedBytes += extraBytes;

    if (blocksToArchive.length === batchCountLimit) {
      // Reached block count limit, yield now
      yield [blocksToArchive, nextBlockToProcess];
      blocksToArchive = [];
      accumulatedBytes = 0;
    }
  }

  if (blocksToArchive.length > 0) {
    yield [blocksToArchive, nextBlockToProcess];
  }
}

async function relayBlocks(
  feedId: U64,
  chainName: ChainName,
  target: Target,
  signer: SignerWithAddress,
  chainConfig: AnyChainConfig,
  nonce: bigint,
  nextBlockToProcess: number,
  lastFinalizedBlockNumber: () => number,
  batchBytesLimit: number,
  batchCountLimit: number,
): Promise<RelayBlocksResult> {
  const polkadotAppsBaseUrl = polkadotAppsUrl(target.targetChainUrl);
  let lastTxPromise: Promise<void> | undefined;
  const blockBatches = fetchBlocksInBatches(
    chainConfig.httpUrl,
    nextBlockToProcess,
    lastFinalizedBlockNumber,
    batchBytesLimit,
    batchCountLimit,
  );
  for await (const [blocksToArchive, newNextBlockToProcess] of blockBatches) {
    nextBlockToProcess = newNextBlockToProcess;
    if (lastTxPromise) {
      await lastTxPromise;
    }
    lastTxPromise = (async () => {
      const blockHash = await pRetry(() => {
        return (
          blocksToArchive.length > 1
            ? target.sendBlocksBatchTx(feedId, chainName, signer, blocksToArchive, nonce)
            : target.sendBlockTx(feedId, chainName, signer, blocksToArchive[0], nonce)
        )
          .catch((e) => {
            // Increase nonce in case error is caused by nonce used by other transaction
            nonce++;
            throw e;
          });
      });
      nonce++;

      logger.debug(
        `Transaction included with ${blocksToArchive.length} ${chainName} blocks: ${polkadotAppsBaseUrl}${blockHash}`,
      );
    })();

    lastTxPromise.catch(() => {
      // This is just to prevent uncaught promise rejection due to promise being stored in a variable
    });
  }

  if (lastTxPromise) {
    await lastTxPromise;
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
  signer: SignerWithAddress,
  chainHeadState: PrimaryChainHeadState,
  chainConfig: AnyChainConfig,
  lastProcessedBlock: number,
  batchBytesLimit: number,
  batchCountLimit: number,
): Promise<void> {
  let nextBlockToProcess = lastProcessedBlock + 1;
  let nonce = (await target.api.rpc.system.accountNextIndex(signer.address)).toBigInt();
  for (; ;) {
    const result = await relayBlocks(
      feedId,
      chainName,
      target,
      signer,
      chainConfig,
      nonce,
      nextBlockToProcess,
      () => {
        return chainHeadState.lastFinalizedBlockNumber;
      },
      batchBytesLimit,
      batchCountLimit,
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
  signer: SignerWithAddress,
  chainHeadState: ParachainHeadState,
  chainConfig: AnyChainConfig,
  lastProcessedBlock: number,
  batchBytesLimit: number,
  batchCountLimit: number,
): Promise<void> {
  let nextBlockToProcess = lastProcessedBlock + 1;
  let nonce = (await target.api.rpc.system.accountNextIndex(signer.address)).toBigInt();
  for (; ;) {
    // TODO: This is simple, but not very efficient
    const lastFinalizedBlockNumber = await pRetry(
      () => getLastFinalizedBlock(chainConfig.httpUrl),
    );
    const result = await relayBlocks(
      feedId,
      chainName,
      target,
      signer,
      chainConfig,
      nonce,
      nextBlockToProcess,
      () => {
        return lastFinalizedBlockNumber;
      },
      batchBytesLimit,
      batchCountLimit,
    );
    nonce = result.nonce;
    nextBlockToProcess = result.nextBlockToProcess;

    await new Promise<void>((resolve) => {
      chainHeadState.newHeadCallback = resolve;
    });
  }
}
