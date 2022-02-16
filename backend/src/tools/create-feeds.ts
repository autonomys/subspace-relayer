// Small utility that will read relayer configuration and creates feeds for all accounts

import * as dotenv from "dotenv";
import { ApiPromise, WsProvider } from "@polkadot/api";

import Config from "../config";
import { getAccount } from "../account";
import { createFeed } from "./common";

dotenv.config();

if (!process.env.CHAIN_CONFIG_PATH) {
  throw new Error(`"CHAIN_CONFIG_PATH" environment variable is required, set it to path to JSON file with configuration of chain(s)`);
}

const config = new Config(process.env.CHAIN_CONFIG_PATH);

(async () => {
  console.log(`Connecting to ${config.targetChainUrl}...`);
  const provider = new WsProvider(config.targetChainUrl);
  const api = await ApiPromise.create({
    provider,
  });

  for (const chainConfig of [config.primaryChain, ...config.parachains]) {
    const account = getAccount(chainConfig.accountSeed);
    console.log(`Creating feed for account ${account.address}...`);
    const feedId = await createFeed(api, account);
    if (feedId !== chainConfig.feedId) {
      console.error(`!!! Expected feedId ${chainConfig.feedId}, but created feedId ${feedId}!`);
    }
  }

  api.disconnect();
})();
