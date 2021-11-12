import * as dotenv from "dotenv";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { U64 } from "@polkadot/types";

import { Config, ParachainConfig, PrimaryChainConfig } from "./config";
import Target from "./target";
import logger from "./logger";
import { getChainName } from './httpApi';
import { PoolSigner } from "./poolSigner";
import { relayFromDownloadedArchive, relayFromParachainHeadState, relayFromPrimaryChainHeadState } from "./relay";
import { ChainId, ParaHeadAndId } from "./types";
import { ParachainHeadState, PrimaryChainHeadState } from "./chainHeadState";
import { getParaHeadAndIdFromEvent, isRelevantRecord } from "./utils";

dotenv.config();

/**
 * How many bytes of data and metadata will we collect for one batch extrinsic (remember, there will be some overhead
 * for calls too)
 */
const BATCH_BYTES_LIMIT = 3_500_000;
/**
 * How many calls can fit into one batch (it should be possible to read this many blocks from disk within one second)
 */
const BATCH_COUNT_LIMIT = 5_000;
/**
 * It is convenient in a few places to treat primary chain as parachain with ID `0`
 */
const PRIMARY_CHAIN_ID = 0 as ChainId;

if (!process.env.CHAIN_CONFIG_PATH) {
  throw new Error(`"CHAIN_CONFIG_PATH" environment variable is required, set it to path to JSON file with configuration of chain(s)`);
}

const config = new Config(process.env.CHAIN_CONFIG_PATH);

function createApi(url: string): Promise<ApiPromise> {
  const provider = new WsProvider(url);
  return ApiPromise.create({
    provider,
  });
}

async function main() {
  const targetApi = await createApi(config.targetChainUrl);

  const target = new Target({
    api: targetApi,
    logger,
    targetChainUrl: config.targetChainUrl,
  });
  const chainHeadStateMap = new Map<ChainId, PrimaryChainHeadState | ParachainHeadState>();

  const processingChains = [config.primaryChain, ...config.parachains]
    .map(async (chainConfig: PrimaryChainConfig | ParachainConfig) => {
      const chainName = await getChainName(chainConfig.httpUrl);
      const signer = new PoolSigner(
        target.api.registry,
        chainConfig.accountSeed,
        1,
      );

      const feedId = await targetApi.createType('U64', chainConfig.feedId);

      const totals = (await targetApi.query.feeds.totals(feedId)) as unknown as { size: U64, count: U64 };
      // We know that block number will not exceed 53-bit size integer
      let lastProcessedBlock = Number(totals.count.toBigInt()) - 1;

      if (chainConfig.downloadedArchivePath) {
        try {
          lastProcessedBlock = await relayFromDownloadedArchive(
            feedId,
            chainName,
            chainConfig.downloadedArchivePath,
            target,
            lastProcessedBlock,
            signer,
            BATCH_BYTES_LIMIT,
            BATCH_COUNT_LIMIT,
          );
        } catch (e) {
          logger.error(`Batch transaction for feedId ${feedId} failed: ${e}`);
          process.exit(1);
        }
      }

      if ('wsUrl' in chainConfig) {
        const chainHeadState = new PrimaryChainHeadState(0);
        chainHeadStateMap.set(PRIMARY_CHAIN_ID, chainHeadState);

        const sourceApi = await createApi(chainConfig.wsUrl);
        await sourceApi.rpc.chain.subscribeFinalizedHeads(async (blockHeader) => {
          try {
            // TODO: Cache this, will be useful for relaying to not download twice
            const { block } = await sourceApi.rpc.chain.getBlock(blockHeader.hash);

            chainHeadState.lastFinalizedBlockNumber = blockHeader.number.toNumber();
            if (chainHeadState.newHeadCallback) {
              chainHeadState.newHeadCallback();
              chainHeadState.newHeadCallback = undefined;
            }

            const blockRecords = await sourceApi.query.system.events.at(blockHeader.hash);

            const result: ParaHeadAndId[] = [];

            for (const [index, { method }] of block.extrinsics.entries()) {
              if (method.section == "paraInherent" && method.method == "enter") {
                blockRecords
                  .filter(isRelevantRecord(index))
                  .map(({ event }) => getParaHeadAndIdFromEvent(event))
                  .forEach((parablockData) => {
                    result.push(parablockData);

                    const parachainHeadState = chainHeadStateMap.get(parablockData.paraId) as ParachainHeadState | undefined;
                    if (parachainHeadState) {
                      if (parachainHeadState.newHeadCallback) {
                        parachainHeadState.newHeadCallback();
                        parachainHeadState.newHeadCallback = undefined;
                      }
                    } else {
                      logger.warn(`Unknown parachain with paraId ${parablockData.paraId}`);
                    }
                  });
              }
            }

            logger.info(`Received ${chainName} primary chain block ${blockHeader.number} with ${result.length} associated parablocks`);
            if (result.length > 0) {
              logger.debug(`ParaIds: ${result.map(({ paraId }) => paraId).join(", ")}`);
            }
          } catch (e) {
            logger.error(`Failed to process block from primary chain ${chainName} feedId ${feedId} ${e}`);
            process.exit(1);
          }
        });

        await relayFromPrimaryChainHeadState(
          feedId,
          chainName,
          target,
          signer,
          chainHeadState,
          chainConfig,
          lastProcessedBlock,
          BATCH_BYTES_LIMIT,
          BATCH_COUNT_LIMIT,
        );
      } else {
        const chainHeadState = new ParachainHeadState();
        chainHeadStateMap.set(chainConfig.paraId, chainHeadState);

        await relayFromParachainHeadState(
          feedId,
          chainName,
          target,
          signer,
          chainHeadState,
          chainConfig,
          lastProcessedBlock,
          BATCH_BYTES_LIMIT,
          BATCH_COUNT_LIMIT,
        );
      }
    });

  await Promise.all(processingChains);
}

// TODO: remove IIFE when Eslint is updated to v8.0.0 (will support top-level await)
(async () => {
  try {
    await main();
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.stack || String(error));
    } else {
      logger.error(String(error));
    }
    process.exit(1);
  }
})();

process.on('uncaughtException', (error: Error) => {
  logger.error(error, 'Uncaught exception: ');
  // TODO: add monitoring
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logger.error((reason as any), 'Unhandled rejection: ');
  // TODO: add monitoring
  process.exit(1);
});
