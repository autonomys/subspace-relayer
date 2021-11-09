// Small utility that will read relayer configuration and creates feeds for all accounts

import * as dotenv from "dotenv";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { EventRecord } from "@polkadot/types/interfaces";
import { KeyringPair } from "@polkadot/keyring/types";

import Config from "../config";
import { getAccount } from "../account";

dotenv.config();

if (!process.env.CHAIN_CONFIG_PATH) {
  throw new Error(`"CHAIN_CONFIG_PATH" environment variable is required, set it to path to JSON file with configuration of chain(s)`);
}

const config = new Config(process.env.CHAIN_CONFIG_PATH);

function createFeed(api: ApiPromise, account: KeyringPair): Promise<number> {
  return new Promise((resolve, reject) => {
    let unsub: () => void;
    api.tx.feeds
      .create()
      .signAndSend(account, { nonce: -1 }, (result) => {
        if (result.isError) {
          reject(result.status.toString());
          unsub();
        } else {
          const feedCreatedEvent = result.events.find(
            ({ event }: EventRecord) => api.events.feeds.FeedCreated.is(event)
          );

          // TODO: handle case if transaction is included but no event found (may happen if API changes)
          if (feedCreatedEvent) {
            const { event } = feedCreatedEvent;
            const feedId = (event.toJSON().data as [number])[0];
            resolve(feedId);
            unsub();
          }
        }
      })
      .then((unsubLocal) => {
        unsub = unsubLocal;
      })
      .catch((e) => {
        reject(e);
      });
  });
}

(async () => {
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
