import { ApiPromise, WsProvider } from "@polkadot/api";
import type { BN } from '@polkadot/util';

import { getAccount } from "./account";
import Config, { sourceChains } from "./config";
import Source from "./source";
import Target from "./target";
import logger from "./logger";
import { createParachainsMap } from './utils';
import { ChainName } from './types';
import State from './state';
import ChainArchive from './chainArchive';

const args = process.argv.slice(2);

const config = new Config({
  accountSeed: process.env.ACCOUNT_SEED,
  targetChainUrl: process.env.TARGET_CHAIN_URL,
  sourceChains,
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

    // currently we can only process kusama from archive - creating only one Source instance
    if (args.length && (args[0] === 'archive')) {
      const path = args[1];

      if (!path) {
        throw new Error("Archive path is not provided");
      }

      const chainArchive = new ChainArchive(path);

      const { url } = config.sourceChains[0];
      const api = await createApi(url);
      const chain = await api.rpc.system.chain();
      const sourceSigner = getAccount(`${config.accountSeed}/${chain}`);

      await target.sendBalanceTx(master, sourceSigner, 1.5);

      // check if feed already exists
      const feedId = await target.getFeedId(sourceSigner);

      const kusama = new Source({
        api,
        chain: chain.toString() as ChainName,
        logger,
        feedId,
        signer: sourceSigner,
        state,
        chainArchive,
      });

      kusama.getBlocksFromArchive().subscribe({
        next: target.sendBlockTx,
      });
    } else {
      // default - processing blocks from RPC API
      const sources = await Promise.all(
        config.sourceChains.map(async ({ url, parachains }) => {
          const api = await createApi(url);
          const chain = await api.rpc.system.chain();
          const sourceSigner = getAccount(`${config.accountSeed}/${chain}`);
          const paraSigners = parachains.map(({ paraId }) => getAccount(`${config.accountSeed}/${paraId}`));

          // TODO: can be optimized by sending batch of txs
          // TODO: master has to delegate spending to sourceSigner and paraSigners
          for (const delegate of [sourceSigner, ...paraSigners]) {
            // send 1.5 units
            await target.sendBalanceTx(master, delegate, 1.5);
          }

          // check if feed already exists
          const feedId = await target.getFeedId(sourceSigner);
          const parachainsMap = await createParachainsMap(target, parachains, paraSigners);

          return new Source({
            api,
            chain: chain.toString() as ChainName,
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
