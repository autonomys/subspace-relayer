// Small utility that will create feed for a single parachain (relay chain feed should already be created). Config should include chain data, chain paraId should be provided as an argument
// `FUNDS_ACCOUNT_SEED` environment variable
import logger from "../logger";
import * as dotenv from "dotenv";
import { ApiPromise, WsProvider } from "@polkadot/api";

import Config from "../config";
import { getAccount } from "../account";
import { ChainId } from "../types";
import { createFeed } from "./common";

dotenv.config();

if (!process.env.FUNDS_ACCOUNT_SEED) {
  throw new Error(`"FUNDS_ACCOUNT_SEED" environment variable is required, set it to account that has enough funds to fund all other accounts from the config`);
}

const fundsAccountSeed = process.env.FUNDS_ACCOUNT_SEED;

if (!process.env.CHAIN_CONFIG_PATH) {
  throw new Error(`"CHAIN_CONFIG_PATH" environment variable is required, set it to path to JSON file with configuration of chain(s)`);
}

const paraId = parseInt(process.argv.slice(2)[0], 10) as ChainId;

if (!paraId) {
  throw new Error('Chain paraId is required');
}

const config = new Config(process.env.CHAIN_CONFIG_PATH);

const chainConfig = config.parachains.find((chain) => chain.paraId === paraId);

if (!chainConfig) {
  throw new Error(`No chain with paraId ${paraId}`);
}

(async () => {
  logger.info(`Connecting to ${config.targetChainUrl}...`);
  const provider = new WsProvider(config.targetChainUrl);
  const api = await ApiPromise.create({ provider });

  try {
    const chainAccount = getAccount(`${fundsAccountSeed}//${chainConfig.feedId}`);
    
    logger.info(`Creating feed for account ${chainAccount.address}...`);
    
    const feedId = await createFeed(api, chainAccount);
    
    if (feedId !== chainConfig.feedId) {
      logger.error(`!!! Expected feedId ${chainConfig.feedId}, but created feedId ${feedId}!`);
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.stack || String(error));
    } else {
      logger.error(String(error));
    }
    process.exit(1);
  } finally {
    api.disconnect();
  }
})();
