// Small utility that will read relayer configuration and list all accounts with free balances
import * as dotenv from "dotenv";
import { ApiPromise, WsProvider } from "@polkadot/api";

import logger from "../logger";
import Config from "../config";
import { getAccount } from "../account";

dotenv.config();

if (!process.env.CHAIN_CONFIG_PATH) {
  throw new Error(`"CHAIN_CONFIG_PATH" environment variable is required, set it to path to JSON file with configuration of chain(s)`);
}

const config = new Config(process.env.CHAIN_CONFIG_PATH);

if (!process.env.FUNDS_ACCOUNT_SEED) {
  throw new Error(`"FUNDS_ACCOUNT_SEED" environment variable is required`);
}

const fundsAccountSeed = process.env.FUNDS_ACCOUNT_SEED;

(async () => {
  logger.info(`Connecting to target chain ${config.targetChainUrl}...`);

  const targetApi = await ApiPromise.create({
    provider: new WsProvider(config.targetChainUrl),
  });

  try {
    for (const chainConfig of [config.primaryChain, ...config.parachains]) {
      const { address } = getAccount(`${fundsAccountSeed}//${chainConfig.feedId}`);
      const { data: balance } = await targetApi.query.system.account(address);

      logger.info(`Feed ID: ${chainConfig.feedId}`);
      logger.info(`Address: ${address}`);
      logger.info(`Balance: ${balance.free.toHuman()} SSC`);
      logger.info('--------------------------------------');
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
  }
})();
