import logger from "../logger";
import { ApiPromise } from "@polkadot/api";
import { EventRecord } from "@polkadot/types/interfaces";
import { KeyringPair } from "@polkadot/keyring/types";
import { Codec } from "@polkadot/types/types";

import { blockToBinary, blockNumberToBuffer } from '../utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchAndStoreBlock(api: ApiPromise, blockNumber: number, db: any): Promise<void> {
    const blockHash = (await api.rpc.chain.getBlockHash(blockNumber)).toString();
    const blockBytes = blockToBinary(await api.rpc.chain.getBlock.raw(blockHash));
  
    const blockNumberAsBuffer = blockNumberToBuffer(blockNumber);
    const blockHashAsBuffer = Buffer.from(blockHash.slice(2), 'hex');
  
    await db.put(
      blockNumberAsBuffer,
      Buffer.concat([
        // Block hash length in bytes
        Buffer.from(Uint8Array.of(blockHashAsBuffer.byteLength)),
        // Block hash itself
        blockHashAsBuffer,
        // Block bytes in full
        blockBytes,
      ]),
    );
    await db.put('last-downloaded-block', blockNumberAsBuffer);
  }

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function createFeed(api: ApiPromise, account: KeyringPair, initialValidation?: Codec ): Promise<number> {
  return new Promise((resolve, reject) => {
    let unsub: () => void;
    api.tx.feeds
      .create(initialValidation?.toHex())
      .signAndSend(account, { nonce: -1 }, (result) => {
        if (result.status.isInBlock) {
          const success = result.dispatchError ? false : true;
          logger.info(`📀 Transaction included at blockHash ${result.status.asInBlock} [success = ${success}]`);
          
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
        } else if (result.status.isBroadcast) {
          logger.info(`🚀 Transaction broadcasted`);
        } else if (result.isError) {
          logger.error('Transaction submission failed');
          reject(result.status.toString());
          unsub();
        } else {
          logger.info(`🤷 Other status ${result.status}`);
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
