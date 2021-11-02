import { ApiPromise, WsProvider } from "@polkadot/api";
import { KeyringPair } from "@polkadot/keyring/types";
import { BN } from '@polkadot/util';

import { getAccount } from "./account";
import Config from "./config";
import Source from "./source";
import Target from "./target";
import logger from "./logger";
import { createParachainsMap } from './utils';
import { ChainName } from './types';
import State from './state';
import ChainArchive from './chainArchive';
import * as archives from './config/archives.json';
import * as sourceChains from './config/sourceChains.json';

const args = process.argv.slice(2);

const REPORT_PROGRESS_INTERVAL = process.env.REPORT_PROGRESS_INTERVAL
    ? parseInt(process.env.REPORT_PROGRESS_INTERVAL, 10)
    : 1000;

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

// TODO: remove IIFE when Eslint is updated to v8.0.0 (will support top-level await)
(async () => {
  try {
    const state = new State({ folder: "./state" });
    const targetApi = await createApi(config.targetChainUrl);

    const target = new Target({ api: targetApi, logger, state });
    const master = getAccount(config.accountSeed);

    if (args.length && (args[0] === 'archive')) {
      const archives = await Promise.all(config.archives.map(async ({ path, url }) => {
        const api = await createApi(url);
        const chain = (await api.rpc.system.chain()).toString() as ChainName;
        const signer = getAccount(`${config.accountSeed}/${chain}`);
        await target.sendBalanceTx(master, signer, 1.5);
        const feedId = await target.getFeedId(signer);

        return new ChainArchive({
          api,
          path,
          chain,
          feedId,
          logger,
          signer,
          state,
        });
      }))

      archives.forEach(async archive => {
        let lastBlockProcessingReportAt = Date.now();
        let processedBlocks = 0;

        let nonce = (await target.api.rpc.system.accountNextIndex((archive.signer as KeyringPair).address)).toBn();
        for await (const blockData of archive.getBlocks()) {
          target.sendBlockTx(blockData, nonce);
          nonce = nonce.add(new BN(1));

          processedBlocks++;

          if (processedBlocks % REPORT_PROGRESS_INTERVAL === 0) {
            const now = Date.now();
            const rate = (Number(REPORT_PROGRESS_INTERVAL) / ((now - lastBlockProcessingReportAt) / 1000)).toFixed(2);
            lastBlockProcessingReportAt = now;

            logger.info(`Processed downloaded ${blockData.chain} block ${blockData.metadata.number} at ${rate} blocks/s`);
          }
        }
      });
    } else {
      // default - processing blocks from RPC API
      const sources = await Promise.all(
        config.sourceChains.map(async ({ url, parachains }) => {
          const api = await createApi(url);
          const chain = (await api.rpc.system.chain()).toString() as ChainName;
          const sourceSigner = getAccount(`${config.accountSeed}/${chain}`);
          const paraSigners = parachains.map(({ paraId }) => getAccount(`${config.accountSeed}/${paraId}`));

          // TODO: can be optimized by sending batch of txs
          // TODO: master has to delegate spending to sourceSigner and paraSigners
          for (const delegate of [sourceSigner, ...paraSigners]) {
            // send 1.5 units
            await target.sendBalanceTx(master, delegate, 1.5);
          }

          const feedId = await target.getFeedId(sourceSigner);
          const parachainsMap = await createParachainsMap(target, parachains, paraSigners);

          return new Source({
            api,
            chain,
            parachainsMap,
            logger,
            feedId,
            signer: sourceSigner,
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
