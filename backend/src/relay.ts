import { Logger } from "pino";
import { U64 } from "@polkadot/types";
import pRetry from "p-retry";

import Target from "./target";
import { TxBlock, ChainName, SignerWithAddress } from "./types";
import ChainArchive from "./chainArchive";
import { HttpApi } from "./httpApi";
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
  httpApi: HttpApi;
}

interface RelayBlocksResult {
  nonce: bigint;
  nextBlockToProcess: number;
}

export default class Relay {
  private readonly logger: Logger;
  private readonly archive?: ChainArchive;
  private readonly polkadotAppsBaseUrl: string;
  private readonly target: Target;
  private readonly httpApi: HttpApi;

  public constructor(params: RelayParams) {
    this.logger = params.logger;
    this.archive = params.archive;
    this.target = params.target;
    this.httpApi = params.httpApi;
    this.polkadotAppsBaseUrl = polkadotAppsUrl(params.target.targetChainUrl);
  }

  // TODO: make private method
  async *readBlocksInBatches(
    lastProcessedBlock: number,
    batchBytesLimit: number,
    batchCountLimit: number,
  ): AsyncGenerator<[TxBlock[], number], void> {
    let blocksToArchive: TxBlock[] = [];
    let accumulatedBytes = 0;
    let lastBlockNumber = 0;
    // TODO: throw error if no archive
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    for await (const blockData of this.archive!.getBlocks(lastProcessedBlock)) {
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

  async relayFromDownloadedArchive(
    feedId: U64,
    chainName: ChainName,
    lastProcessedBlock: number,
    signer: SignerWithAddress,
    batchBytesLimit: number,
    batchCountLimit: number,
  ): Promise<number> {
    let lastBlockProcessingReportAt = Date.now();

    let nonce = (await this.target.api.rpc.system.accountNextIndex(signer.address)).toBigInt();

    let lastTxPromise: Promise<void> | undefined;
    const blockBatches = this.readBlocksInBatches(lastProcessedBlock, batchBytesLimit, batchCountLimit);
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
          {
            randomize: true,
            forever: true,
            minTimeout: 1000,
            maxTimeout: 60 * 60 * 1000,
            onFailedAttempt: error => this.logger.error(error, 'target.sendBlocksBatchTx retry error:'),
          },
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

  async *fetchBlocksInBatches(
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
        () => this.httpApi.getBlockByNumber(httpUrl, nextBlockToProcess),
        {
          randomize: true,
          forever: true,
          minTimeout: 1000,
          maxTimeout: 60 * 60 * 1000,
          onFailedAttempt: error => this.logger.error(error, 'httpApi.getBlockByNumber retry error:'),
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

  async relayBlocks(
    feedId: U64,
    chainName: ChainName,
    signer: SignerWithAddress,
    chainConfig: AnyChainConfig,
    nonce: bigint,
    nextBlockToProcess: number,
    lastFinalizedBlockNumber: () => number,
    batchBytesLimit: number,
    batchCountLimit: number,
  ): Promise<RelayBlocksResult> {
    let lastTxPromise: Promise<void> | undefined;
    const blockBatches = this.fetchBlocksInBatches(
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
          {
            randomize: true,
            forever: true,
            minTimeout: 1000,
            maxTimeout: 60 * 60 * 1000,
            onFailedAttempt: error => this.logger.error(error, 'target.sendBlock[sBatch]Tx retry error:'),
          },
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

  async relayFromPrimaryChainHeadState(
    feedId: U64,
    chainName: ChainName,
    signer: SignerWithAddress,
    chainHeadState: PrimaryChainHeadState,
    chainConfig: AnyChainConfig,
    lastProcessedBlock: number,
    batchBytesLimit: number,
    batchCountLimit: number,
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

  async relayFromParachainHeadState(
    feedId: U64,
    chainName: ChainName,
    signer: SignerWithAddress,
    chainHeadState: ParachainHeadState,
    chainConfig: AnyChainConfig,
    lastProcessedBlock: number,
    batchBytesLimit: number,
    batchCountLimit: number,
  ): Promise<void> {
    let nextBlockToProcess = lastProcessedBlock + 1;
    let nonce = (await this.target.api.rpc.system.accountNextIndex(signer.address)).toBigInt();
    for (; ;) {
      // TODO: This is simple, but not very efficient
      const lastFinalizedBlockNumber = await pRetry(
        () => this.httpApi.getLastFinalizedBlock(chainConfig.httpUrl),
        {
          randomize: true,
          forever: true,
          minTimeout: 1000,
          maxTimeout: 60 * 60 * 1000,
          onFailedAttempt: error => this.logger.error(error, 'httpApi.getLastFinalizedBlock retry error:'),
        },
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
}
