import { U64 } from "@polkadot/types";
import pRetry, { FailedAttemptError } from "p-retry";
import { Logger } from "pino";

import Target from "./target";
import { TxBlock, ChainName, SignerWithAddress } from "./types";
import ChainArchive from "./chainArchive";
import { getBlockByNumber, getLastFinalizedBlock } from "./httpApi";
import { AnyChainConfig } from "./config";
import { ParachainHeadState, PrimaryChainHeadState } from "./chainHeadState";

function polkadotAppsUrl(targetChainUrl: string) {
  const url = new URL('https://polkadot.js.org/apps/');
  url.searchParams.set('rpc', targetChainUrl);
  url.hash = '/explorer/query/'
  return url.toString();
}

interface RelayParams {
  logger: Logger;
  archive?: ChainArchive;
  target: Target;
  batchBytesLimit: number;
  batchCountLimit: number;
}

interface RelayBlocksResult {
  nonce: bigint;
  nextBlockToProcess: number;
}

// used by pRetry in case of failing request
const createRetryOptions = (onFailedAttempt: ((error: FailedAttemptError) => void | Promise<void>)) => ({
  randomize: true,
  forever: true,
  minTimeout: 1000,
  maxTimeout: 60 * 60 * 1000,
  onFailedAttempt,
})

export default class Relay {
  private readonly logger: Logger;
  private readonly archive?: ChainArchive;
  private readonly polkadotAppsBaseUrl: string;
  private readonly target: Target;
  private readonly batchBytesLimit: number;
  private readonly batchCountLimit: number;

  public constructor(params: RelayParams) {
    this.logger = params.logger;
    this.archive = params.archive;
    this.target = params.target;
    this.polkadotAppsBaseUrl = polkadotAppsUrl(params.target.targetChainUrl);
    this.batchBytesLimit = params.batchBytesLimit;
    this.batchCountLimit = params.batchCountLimit;
  }


  private async * readBlocksInBatches(lastProcessedBlock: number): AsyncGenerator<[TxBlock[], number], void> {
    let blocksToArchive: TxBlock[] = [];
    let accumulatedBytes = 0;
    let lastBlockNumber = 0;

    // at this stage we can be sure archive is not undefined
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    for await (const blockData of this.archive!.getBlocks(lastProcessedBlock)) {
      const block = blockData.block;
      const metadata = Buffer.from(JSON.stringify(blockData.metadata), 'utf-8');
      const extraBytes = block.byteLength + metadata.byteLength;

      if (accumulatedBytes + extraBytes >= this.batchBytesLimit) {
        // With new block limit will be exceeded, yield now
        yield [blocksToArchive, lastBlockNumber];
        blocksToArchive = [];
        accumulatedBytes = 0;
      }

      blocksToArchive.push({ block, metadata });
      accumulatedBytes += extraBytes;
      lastBlockNumber = blockData.metadata.number;

      if (blocksToArchive.length === this.batchCountLimit) {
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

  public async fromDownloadedArchive(
    feedId: U64,
    chainName: ChainName,
    lastProcessedBlock: number,
    signer: SignerWithAddress,
  ): Promise<number> {
    if (!this.archive) {
      throw new Error('Cannot read block from archive: archive is not provided');
    }

    let lastBlockProcessingReportAt = Date.now();
    let nonce = (await this.target.api.rpc.system.accountNextIndex(signer.address)).toBigInt();
    let lastTxPromise: Promise<void> | undefined;

    const blockBatches = this.readBlocksInBatches(lastProcessedBlock);

    for await (const [blocksToArchive, lastBlockNumber] of blockBatches) {
      if (lastTxPromise) {
        await lastTxPromise;
      }
      lastTxPromise = (async () => {
        const blockHash = await pRetry(
          () => this.target
            .sendBlocksBatchTx(feedId, chainName, signer, blocksToArchive, nonce)
            .catch((e) => {
              // Increase nonce in case error is caused by nonce used by other transaction
              nonce++;
              throw e;
            }),
          createRetryOptions(error => this.logger.error(error, 'sendBlocksBatchTx retry error:')),
        );
        nonce++;

        this.logger.debug(
          `Transaction included with ${blocksToArchive.length} ${chainName} blocks: ${this.polkadotAppsBaseUrl}${blockHash}`,
        );

        {
          const now = Date.now();
          const rate = (blocksToArchive.length / ((now - lastBlockProcessingReportAt) / 1000)).toFixed(2);
          lastBlockProcessingReportAt = now;

          this.logger.info(`Processed downloaded ${chainName} block ${lastBlockNumber} at ${rate} blocks/s`);
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

  private async * fetchBlocksInBatches(
    httpUrl: string,
    nextBlockToProcess: number,
    lastFinalizedBlockNumber: () => number,
  ): AsyncGenerator<[TxBlock[], number], void> {
    let blocksToArchive: TxBlock[] = [];
    let accumulatedBytes = 0;

    for (; nextBlockToProcess <= lastFinalizedBlockNumber(); nextBlockToProcess++) {
      // TODO: Cache of mapping from block number to its hash for faster fetching
      const [blockHash, block] = await pRetry(
        () => getBlockByNumber(httpUrl, nextBlockToProcess),
        createRetryOptions(error => this.logger.debug(error, 'getBlockByNumber retry error:')),
      );

      const metadata = Buffer.from(
        JSON.stringify({
          hash: blockHash,
          number: nextBlockToProcess,
        }),
        'utf-8',
      );

      const extraBytes = block.byteLength + metadata.byteLength;

      if (accumulatedBytes + extraBytes >= this.batchBytesLimit) {
        // With new block limit will be exceeded, yield now
        yield [blocksToArchive, nextBlockToProcess];
        blocksToArchive = [];
        accumulatedBytes = 0;
      }

      blocksToArchive.push({ block, metadata });
      accumulatedBytes += extraBytes;

      if (blocksToArchive.length === this.batchCountLimit) {
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

  private async relayBlocks(
    feedId: U64,
    chainName: ChainName,
    signer: SignerWithAddress,
    chainConfig: AnyChainConfig,
    nonce: bigint,
    nextBlockToProcess: number,
    lastFinalizedBlockNumber: () => number,
  ): Promise<RelayBlocksResult> {
    let lastTxPromise: Promise<void> | undefined;

    const blockBatches = this.fetchBlocksInBatches(
      chainConfig.httpUrl,
      nextBlockToProcess,
      lastFinalizedBlockNumber,
    );

    for await (const [blocksToArchive, newNextBlockToProcess] of blockBatches) {
      nextBlockToProcess = newNextBlockToProcess;
      if (lastTxPromise) {
        await lastTxPromise;
      }
      lastTxPromise = (async () => {
        const blockHash = await pRetry(
          () => {
            return (
              blocksToArchive.length > 1
                ? this.target.sendBlocksBatchTx(feedId, chainName, signer, blocksToArchive, nonce)
                : this.target.sendBlockTx(feedId, chainName, signer, blocksToArchive[0], nonce)
            )
              .catch((e) => {
                // Increase nonce in case error is caused by nonce used by other transaction
                nonce++;
                throw e;
              });
          },
          createRetryOptions(error => this.logger.error(error, 'sendBlock[sBatch]Tx retry error:')),
        );
        nonce++;

        this.logger.debug(
          `Transaction included with ${blocksToArchive.length} ${chainName} blocks: ${this.polkadotAppsBaseUrl}${blockHash}`,
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

  public async fromPrimaryChainHeadState(
    feedId: U64,
    chainName: ChainName,
    signer: SignerWithAddress,
    chainHeadState: PrimaryChainHeadState,
    chainConfig: AnyChainConfig,
    lastProcessedBlock: number,
  ): Promise<void> {
    let nextBlockToProcess = lastProcessedBlock + 1;
    let nonce = (await this.target.api.rpc.system.accountNextIndex(signer.address)).toBigInt();

    for (; ;) {
      const result = await this.relayBlocks(
        feedId,
        chainName,
        signer,
        chainConfig,
        nonce,
        nextBlockToProcess,
        () => {
          return chainHeadState.lastFinalizedBlockNumber;
        },
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


  public async fromParachainHeadState(
    feedId: U64,
    chainName: ChainName,
    signer: SignerWithAddress,
    chainHeadState: ParachainHeadState,
    chainConfig: AnyChainConfig,
    lastProcessedBlock: number,
  ): Promise<void> {
    let nextBlockToProcess = lastProcessedBlock + 1;
    let nonce = (await this.target.api.rpc.system.accountNextIndex(signer.address)).toBigInt();

    for (; ;) {
      // TODO: This is simple, but not very efficient
      const lastFinalizedBlockNumber = await pRetry(
        () => getLastFinalizedBlock(chainConfig.httpUrl),
        createRetryOptions(error => this.logger.error(error, 'getLastFinalizedBlock retry error:')),
      );

      const result = await this.relayBlocks(
        feedId,
        chainName,
        signer,
        chainConfig,
        nonce,
        nextBlockToProcess,
        () => {
          return lastFinalizedBlockNumber;
        },
      );

      nonce = result.nonce;
      nextBlockToProcess = result.nextBlockToProcess;

      await new Promise<void>((resolve) => {
        chainHeadState.newHeadCallback = resolve;
      });
    }
  }
}
