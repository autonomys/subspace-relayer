import { ApiPromise, WsProvider } from "@polkadot/api";
import { BN } from '@polkadot/util';

import Config from "./config";
import Source from "./source";
import Target from "./target";
import logger from "./logger";
import { createParachainsMap } from './utils';
import { ChainName, BatchTxBlock } from './types';
import State from './state';
import ChainArchive from './chainArchive';
import * as archives from './config/archives.json';
import * as sourceChains from './config/sourceChains.json';
import { getChainName } from './httpApi';
import { PoolSigner } from "./poolSigner";

const args = process.argv.slice(2);

// TODO: remove hardcoded url
const polkadotAppsUrl =
  "https://polkadot.js.org/apps/?rpc=ws%3A%2F%2F127.0.0.1%3A9944#/explorer/query/";
/**
 * How many bytes of data and metadata will we collect for one batch extrinsic (remember, there will be some overhead
 * for calls too)
 */
const BATCH_BYTES_LIMIT = 3_500_000;
/**
 * How many calls can fit into one batch (it should be possible to read this many blocks from disk within one second)
 */
const BATCH_COUNT_LIMIT = 5_000;
const SIGNER_POOL_SIZE = process.env.SIGNER_POOL_SIZE
    ? parseInt(process.env.SIGNER_POOL_SIZE, 10)
    : 4;

const config = new Config({
  accountSeed: process.env.ACCOUNT_SEED,
  targetChainUrl: process.env.TARGET_CHAIN_URL,
  sourceChains,
  archives,
});

const createApi = async (url: string) => {
  const provider = new WsProvider(url);
  const api = await ApiPromise.create({
    provider,
  });

  return api;
};

// performs blocks resync first, after subscribes and processes new blocks
const processSourceBlocks = (target: Target) => async (source: Source) => {
  let hasResynced = false;
  let lastFinalizedBlock: BN;

  await new Promise<void>((resolve, reject) => {
    try {
      source.subscribeHeads().subscribe({
        next: header => {
          if (hasResynced) {
            source.getBlocksByHash(header.hash).subscribe({
              next: target.sendBlockTx,
              error: (error) => logger.error((error as Error).message)
            });
          } else if (!lastFinalizedBlock) {
            lastFinalizedBlock = header.number;
            resolve();
          } else {
            lastFinalizedBlock = header.number;
          }
        }
      });
    } catch (error) {
      if (!lastFinalizedBlock) {
        reject(error);
      } else {
        logger.error((error as Error).message);
      }
    }
  });

  source.resyncBlocks().subscribe({
    next: target.sendBlockTx,
    error: (error) => logger.error((error as Error).message),
    complete: () => {
      hasResynced = true;
    }
  });
}

async function *readBlocksInBatches(
  archive: ChainArchive,
  lastProcessedBlock: number,
): AsyncGenerator<[BatchTxBlock[], number], void> {
  let blocksToArchive: BatchTxBlock[] = [];
  let accumulatedBytes = 0;
  let lastBlockNumber = 0;
  for await (const blockData of archive.getBlocks(lastProcessedBlock)) {
    const block = blockData.block;
    const metadata = Buffer.from(JSON.stringify(blockData.metadata), 'utf-8');
    const extraBytes = block.byteLength + metadata.byteLength;

    if (accumulatedBytes + extraBytes >= BATCH_BYTES_LIMIT) {
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

    if (blocksToArchive.length === BATCH_COUNT_LIMIT) {
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

// TODO: remove IIFE when Eslint is updated to v8.0.0 (will support top-level await)
(async () => {
  try {
    const state = new State({ folder: "./state" });
    const targetApi = await createApi(config.targetChainUrl);

    const target = new Target({ api: targetApi, logger, state });
    const master = new PoolSigner(targetApi.registry, config.accountSeed, 1);

    if (args.length && (args[0] === 'archive')) {
      config.archives.map(async ({ path, url }) => {
        const chain = await getChainName(url);
        const signer = new PoolSigner(
            target.api.registry,
            `${config.accountSeed}/${chain}`,
            SIGNER_POOL_SIZE,
        );
        // TODO: Do not send balance
        await target.sendBalanceTx(master, signer.address, 1.5);
        const feedId = await target.getFeedId(signer);

        const archive = new ChainArchive({
          path,
          logger,
        });

        let lastBlockProcessingReportAt = Date.now();

        let nonce = (await target.api.rpc.system.accountNextIndex(signer.address)).toBigInt();
        const lastProcessedString = await state.getLastProcessedBlockByName(chain);
        const lastProcessedBlock = lastProcessedString ? parseInt(lastProcessedString, 10) : 0;

        let lastTxPromise: Promise<void> | undefined;
        for await (const [blocksBatch, lastBlockNumber] of readBlocksInBatches(archive, lastProcessedBlock)) {
          if (lastTxPromise) {
            await lastTxPromise;
          }
          lastTxPromise = (async () => {
            try {
              const blockHash = await target.sendBlocksBatchTx(feedId, signer, blocksBatch, nonce);
              nonce++;

              logger.debug(`Transaction included: ${polkadotAppsUrl}${blockHash}`);

              {
                const now = Date.now();
                const rate = (blocksBatch.length / ((now - lastBlockProcessingReportAt) / 1000)).toFixed(2);
                lastBlockProcessingReportAt = now;

                logger.info(`Processed downloaded ${chain} block ${lastBlockNumber} at ${rate} blocks/s`);
              }

              await state.saveLastProcessedBlock(chain, lastBlockNumber);
            } catch (e) {
              logger.error(`Batch transaction for feedId ${feedId} failed: ${e}`);
              process.exit(1);
            }
          })();
        }

        // TODO: Check what timer prevents this from exiting naturally and remove this piece of code, this will also
        //  cause problems when we have more than one archive
        process.exit(0);
      });
    } else {
      // default - processing blocks from RPC API
      const sources = await Promise.all(
        config.sourceChains.map(async ({ url, parachains }) => {
          const api = await createApi(url);
          const chain = (await api.rpc.system.chain()).toString() as ChainName;
          const signer = new PoolSigner(
              target.api.registry,
              `${config.accountSeed}/${chain}`,
              SIGNER_POOL_SIZE,
          );
          const paraSigners = parachains.map(({ paraId }) => {
            return new PoolSigner(
              target.api.registry,
              `${config.accountSeed}/${paraId}`,
              SIGNER_POOL_SIZE,
            );
          });

          // TODO: can be optimized by sending batch of txs
          // TODO: master has to delegate spending to sourceSigner and paraSigners
          for (const delegate of [signer, ...paraSigners]) {
            // send 1.5 units
            await target.sendBalanceTx(master, delegate.address, 1.5);
          }

          const feedId = await target.getFeedId(signer);
          const parachainsMap = await createParachainsMap(target, parachains, paraSigners);

          return new Source({
            api,
            chain,
            parachainsMap,
            logger,
            feedId,
            signer,
            state,
          });
        })
      );

      sources.forEach(processSourceBlocks(target));
    }
  } catch (error) {
    logger.error((error as Error).message);
  }
})();
