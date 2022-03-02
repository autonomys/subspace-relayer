// Small utility that will read relayer configuration and fund accounts using account whose seed is specified in
// `FUNDS_ACCOUNT_SEED` environment variable
import logger from "../logger";
import * as dotenv from "dotenv";
import { ApiPromise, WsProvider } from "@polkadot/api";

import Config from "../config";
import { getAccount } from "../account";

dotenv.config();

if (!process.env.FUNDS_ACCOUNT_SEED) {
  throw new Error(`"FUNDS_ACCOUNT_SEED" environment variable is required, set it to account that has enough funds to fund all other accounts from the config`);
}

const fundsAccountSeed = process.env.FUNDS_ACCOUNT_SEED;

if (!process.env.CHAIN_CONFIG_PATH) {
  throw new Error(`"CHAIN_CONFIG_PATH" environment variable is required, set it to path to JSON file with configuration of chain(s)`);
}

const config = new Config(process.env.CHAIN_CONFIG_PATH);

(async () => {
  logger.info(`Connecting to ${config.targetChainUrl}...`);
  const provider = new WsProvider(config.targetChainUrl);
  const api = await ApiPromise.create({
    provider,
  });
  const fundsAccount = getAccount(fundsAccountSeed);

  const unsub = await api.tx.utility.batchAll(
    [config.primaryChain, ...config.parachains]
      .map((chainConfig) => {
        const account = getAccount(chainConfig.accountSeed).address;
        // Send 1 SSC
        logger.info(`Funding account ${account}...`);
        return api.tx.balances.transfer(account, 10n ** 18n);
      })
  )
    .signAndSend(fundsAccount, { nonce: -1 }, (result) => {
      if (result.status.isInBlock) {
        const success = result.dispatchError ? false : true;
        logger.info(`📀 Transaction included at blockHash ${result.status.asInBlock} [success = ${success}]`);
        unsub();
        api.disconnect();
      } else if (result.status.isBroadcast) {
        logger.info(`🚀 Transaction broadcasted`);
      } else if (result.isError) {
        logger.error('Transaction submission failed');
        unsub();
        api.disconnect();
      } else {
        logger.info(`🤷 Other status ${result.status}`);
      }
    });
})();
