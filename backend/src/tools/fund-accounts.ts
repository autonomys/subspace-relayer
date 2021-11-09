// Small utility that will read relayer configuration and fund accounts using account whose seed is specified in
// `FUNDS_ACCOUNT_SEED` environment variable

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
        console.log(`Funding account ${account}...`);
        return api.tx.balances.transfer(account, 10n ** 18n);
      })
  )
    .signAndSend(fundsAccount, { nonce: -1 }, (result) => {
      if (result.isError) {
        unsub();
        api.disconnect();
      } else if (result.status.isInBlock) {
        unsub();
        api.disconnect();
      }
    });
})();
