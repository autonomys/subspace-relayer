// Small utility that will read relayer configuration and creates feeds for all accounts
import * as dotenv from "dotenv";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { BlockHash } from "@polkadot/types/interfaces";

import logger from "../logger";
import Config, { PrimaryChainConfig } from "../config";
import { getAccount } from "../account";
import { createFeed } from "./common";

dotenv.config();

if (!process.env.CHAIN_CONFIG_PATH) {
  throw new Error(`"CHAIN_CONFIG_PATH" environment variable is required, set it to path to JSON file with configuration of chain(s)`);
}

const config = new Config(process.env.CHAIN_CONFIG_PATH);

if (!process.env.FUNDS_ACCOUNT_SEED) {
  throw new Error(`"FUNDS_ACCOUNT_SEED" environment variable is required`);
}

const fundsAccountSeed = process.env.FUNDS_ACCOUNT_SEED;

async function getSetId(api: ApiPromise, blockHash: BlockHash) {
  const apiAt = await api.at(blockHash);
  const setId = await apiAt.query.grandpa.currentSetId();
  return setId;
}

(async () => {
  logger.info(`Connecting to target chain ${config.targetChainUrl}...`);

  const targetApi = await ApiPromise.create({
    provider: new WsProvider(config.targetChainUrl),
    types: {
      InitialValidation: {
        bestKnownFinalizedHeader: "Vec<u8>",
        setId: "SetId",
      }
    }
  });

  logger.info(`Connecting to source chain ${config.primaryChain.wsUrls[0]}...`);

  const sourceApi = await ApiPromise.create({
    provider: new WsProvider(config.primaryChain.wsUrls),
  });

  try {
    for (const chainConfig of [config.primaryChain, ...config.parachains]) {
      const chainAccount = getAccount(`${fundsAccountSeed}//${chainConfig.feedId}`);
      logger.info(`Creating feed for account ${chainAccount.address}...`);

      const isRelayChain = chainConfig.feedId === config.primaryChain.feedId;

      let initialValidation;

      // initialize grandpa finality verifier for relay chain
      if (isRelayChain) {
        // get header to start verification from
        const blockNumber = (chainConfig as PrimaryChainConfig).bestGrandpaFinalizedBlockNumber;
        const hash = await sourceApi.rpc.chain.getBlockHash(blockNumber);
        const bestKnownFinalizedHeader = (await sourceApi.rpc.chain.getHeader(hash)).toHex();
        const setId = await getSetId(sourceApi, hash);

        initialValidation = targetApi.createType("InitialValidation", {
          bestKnownFinalizedHeader,
          setId,
        });
      }

      const chainType = await targetApi.createType("SubspaceRuntimeFeedProcessorKind", chainConfig.feedProcessor);
      const feedId = await createFeed(targetApi, chainAccount, chainType.toHex(), initialValidation?.toHex());

      if (feedId !== chainConfig.feedId) {
        logger.error(`!!! Expected feedId ${chainConfig.feedId}, but created feedId ${feedId}!`);
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.stack || String(error));
    } else {
      logger.error(String(error));
    }
    process.exit(1);
  } finally {
    targetApi.disconnect();
    sourceApi.disconnect();
  }
})();
