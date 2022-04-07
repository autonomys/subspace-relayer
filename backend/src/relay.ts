import { U64 } from "@polkadot/types";
import pRetry, { FailedAttemptError } from "p-retry";
import { Logger } from "pino";
import { ApiPromise } from "@polkadot/api";

import Target from "./target";
import { TxBlock, ChainName, SignerWithAddress, SignedBlockJsonRpc } from "./types";
import { ParachainHeadState, PrimaryChainHeadState } from "./chainHeadState";
import { blockToBinary } from './utils';
import { IChainArchive } from './chainArchive';

function polkadotAppsUrl(targetChainUrl: string) {
  const url = new URL('https://polkadot.js.org/apps/');
  url.searchParams.set('rpc', targetChainUrl);
  url.hash = '/explorer/query/'
  return url.toString();
}

interface RelayParams {
  logger: Logger;
  target: Target;
  sourceApi: ApiPromise;
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
  private readonly polkadotAppsBaseUrl: string;
  private readonly target: Target;
  private readonly sourceApi: ApiPromise;
  private readonly batchBytesLimit: number;
  private readonly batchCountLimit: number;

  public constructor(params: RelayParams) {
    this.logger = params.logger;
    this.target = params.target;
    this.sourceApi = params.sourceApi;
    this.polkadotAppsBaseUrl = polkadotAppsUrl(params.target.targetChainUrl);
    this.batchBytesLimit = params.batchBytesLimit;
    this.batchCountLimit = params.batchCountLimit;
  }

  // TODO: add finality proof fetching - same as for fetchBlocksInBatches
  private async * readBlocksInBatches(lastProcessedBlock: number, archive: IChainArchive): AsyncGenerator<[TxBlock[], number], void> {
    let blocksToArchive: TxBlock[] = [];
    let accumulatedBytes = 0;
    let lastBlockNumber = 0;

    for await (const blockData of archive.getBlocks(lastProcessedBlock)) {
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
    archive: IChainArchive,
  ): Promise<number> {
    let lastBlockProcessingReportAt = Date.now();
    let nonce = (await this.target.api.rpc.system.accountNextIndex(signer.address)).toBigInt();
    let lastTxPromise: Promise<void> | undefined;

    const blockBatches = this.readBlocksInBatches(lastProcessedBlock, archive);

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
          createRetryOptions(error => this.logger.error(error, `sendBlocksBatchTx retry error (chain: ${chainName}, signer: ${signer.address}):`)),
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
    nextBlockToProcess: number,
    lastFinalizedBlockNumber: () => number,
    isRelayChain?: boolean,
  ): AsyncGenerator<[TxBlock[], number], void> {
    let blocksToArchive: TxBlock[] = [];
    let accumulatedBytes = 0;

    for (; nextBlockToProcess <= lastFinalizedBlockNumber(); nextBlockToProcess++) {
      // TODO: Cache of mapping from block number to its hash for faster fetching
      const blockHash = await pRetry(
        () => this.sourceApi.rpc.chain.getBlockHash(nextBlockToProcess),
        createRetryOptions(error => this.logger.error(error, 'getBlockHash retry error:')),
      );

      const rawBlock = await pRetry(
        () => this.sourceApi.rpc.chain.getBlock.raw(blockHash),
        createRetryOptions(error => this.logger.error(error, 'getBlock retry error:')),
      ) as SignedBlockJsonRpc;

      const metadata = Buffer.from(
        JSON.stringify({
          hash: blockHash,
          number: nextBlockToProcess,
        }),
        'utf-8',
      );

      const block = isRelayChain
        ? await this.getBlockWithJustification(rawBlock)
        : blockToBinary(rawBlock);

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

  private async getBlockWithJustification(rawBlock: SignedBlockJsonRpc) {
    // adding justifications from finality proof if there is none
    if (!rawBlock.justifications) {
      const { number } = rawBlock.block.header;
      const proof = await pRetry(
        () => this.sourceApi.rpc.grandpa.proveFinality(number),
        createRetryOptions(error => this.logger.error(error, `get block justifications for #${number} retry error:`)),
      );
      const proofBytes = proof.toU8a(true);
      // finality proof returns encoded block hash, justification and unknown headers
      // only care about justification, removing leading extra bytes: 32 for block hash (has known fixed length)
      const justification = proofBytes.slice(32);

      rawBlock.justifications = [
        [
          [70, 82, 78, 75], // FRNK
          Array.from(justification)
        ]
      ];
    }

    return blockToBinary(rawBlock);
  }

  private async relayBlocks(
    feedId: U64,
    chainName: ChainName,
    signer: SignerWithAddress,
    nonce: bigint,
    nextBlockToProcess: number,
    lastFinalizedBlockNumber: () => number,
  ): Promise<RelayBlocksResult> {
    let lastTxPromise: Promise<void> | undefined;

    // TODO: implement better way to determine if chain is a relay chain
    const isRelayChain = chainName === 'Kusama' || chainName === 'Polkadot';

    const blockBatches = this.fetchBlocksInBatches(
      nextBlockToProcess,
      lastFinalizedBlockNumber,
      isRelayChain,
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
          createRetryOptions(error => this.logger.error(error, `sendBlock[sBatch]Tx retry error (chain: ${chainName}, signer: ${signer.address}):`)),
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
    lastProcessedBlock: number,
  ): Promise<void> {
    let nextBlockToProcess = lastProcessedBlock + 1;
    let nonce = (await this.target.api.rpc.system.accountNextIndex(signer.address)).toBigInt();

    for (; ;) {
      const result = await this.relayBlocks(
        feedId,
        chainName,
        signer,
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
    lastProcessedBlock: number,
  ): Promise<void> {
    let nextBlockToProcess = lastProcessedBlock + 1;
    let nonce = (await this.target.api.rpc.system.accountNextIndex(signer.address)).toBigInt();

    for (; ;) {
      const lastFinalizedHash = await pRetry(
        () => this.sourceApi.rpc.chain.getFinalizedHead(),
        createRetryOptions(error => this.logger.error(error, 'getFinalizedHead retry error:')),
      );
      const lastFinalizedBlockNumber = (await pRetry(
        () => this.sourceApi.rpc.chain.getHeader(lastFinalizedHash),
        createRetryOptions(error => this.logger.error(error, 'getHeader retry error:')),
      )).number.toNumber();

      const result = await this.relayBlocks(
        feedId,
        chainName,
        signer,
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
