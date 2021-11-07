import { ApiPromise } from "@polkadot/api";
import { Subscription, EMPTY, catchError } from "rxjs";
import { takeWhile } from "rxjs/operators";
import { Logger } from "pino";
import { ISubmittableResult } from "@polkadot/types/types";
import { EventRecord, Hash } from "@polkadot/types/interfaces";
import { U64 } from "@polkadot/types/primitive";

import { SignerWithAddress, TxData, BatchTxBlock } from "./types";
import State from './state';

// TODO: remove hardcoded url
const polkadotAppsUrl =
  "https://polkadot.js.org/apps/?rpc=ws%3A%2F%2F127.0.0.1%3A9944#/explorer/query/";

interface TargetConstructorParams {
  api: ApiPromise;
  logger: Logger;
  state: State;
}

class Target {
  public readonly api: ApiPromise;
  private readonly logger: Logger;
  private readonly state: State;

  constructor({ api, logger, state }: TargetConstructorParams) {
    this.api = api;
    this.logger = logger;
    this.state = state;
    this.sendBlockTx = this.sendBlockTx.bind(this);
    this.logTxResult = this.logTxResult.bind(this);
  }

  private logTxResult({ status, events }: ISubmittableResult, subscription: Subscription) {
    if (status.isInBlock) {
      const isExtrinsicFailed = events
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter(({ event }) => (event as any).isSystem)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .find(({ event }) => (event as any).asSystem.isExtrinsicFailed);

      if (isExtrinsicFailed) {
        this.logger.error("Extrinsic failed");
      } else {
        this.logger.debug(
          `Transaction included: ${polkadotAppsUrl}${status.asInBlock}`
        );
      }
      subscription.unsubscribe();
    }
  }

  sendBlockTx({ feedId, block, metadata, chain, signer }: TxData, nonce?: number): Subscription {
    this.logger.debug(`Sending ${chain} block to feed: ${feedId}`);
    this.logger.debug(`Signer: ${signer.address}`);
    // metadata is stored as Vec<u8>
    // to decode: new TextDecoder().decode(new Uint8Array([...]))
    const metadataPayload = JSON.stringify(metadata);
    const subscription = this.api.rx.tx.feeds
      .put(feedId, `0x${block.toString('hex')}`, metadataPayload)
      // it is required to specify nonce, otherwise transaction within same block will be rejected
      // if nonce is -1 API will do the lookup for the right value
      // https://polkadot.js.org/docs/api/cookbook/tx/#how-do-i-take-the-pending-tx-pool-into-account-in-my-nonce
      .signAndSend(signer.address, { nonce: nonce || -1, signer }, Promise.resolve)
      .pipe(
        takeWhile(({ status }) => !status.isInBlock, true),
        catchError((error) => {
          this.logger.error(error);
          return EMPTY;
        })
      )
      .subscribe((result) => {
        this.logTxResult(result, subscription);
      });
    return subscription;
  }

  sendBlocksBatchTx(
    feedId: U64,
    signer: SignerWithAddress,
    txData: BatchTxBlock[],
    nonce?: bigint,
  ): Promise<Hash> {
    this.logger.debug(`Sending ${txData.length} blocks to feed: ${feedId}`);
    this.logger.debug(`Signer: ${signer.address}`);

    const putCalls = txData.map(({ block, metadata }: BatchTxBlock) => {
      return this.api.tx.feeds.put(
        feedId,
        `0x${block.toString('hex')}`,
        `0x${metadata.toString('hex')}`,
      );
    });
    return new Promise((resolve, reject) => {
      let unsub: () => void;
      this.api.tx.utility
        .batchAll(putCalls)
        // it is required to specify nonce, otherwise transaction within same block will be rejected
        // if nonce is -1 API will do the lookup for the right value
        // https://polkadot.js.org/docs/api/cookbook/tx/#how-do-i-take-the-pending-tx-pool-into-account-in-my-nonce
        .signAndSend(signer.address, { nonce: nonce || -1, signer }, (result) => {
          if (result.isError) {
            reject(result.status.toString());
            unsub();
          } else if (result.status.isInBlock) {
            resolve(result.status.asInBlock);
            unsub();
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

  private async sendCreateFeedTx(signer: SignerWithAddress): Promise<U64> {
    this.logger.info(`Creating feed for signer ${signer.address}`);
    this.logger.debug(`Signer: ${signer.address}`);
    return new Promise((resolve) => {
      const subscription = this.api.rx.tx.feeds
        .create()
        .signAndSend(signer.address, { nonce: -1, signer }, Promise.resolve)
        .pipe(
          takeWhile(({ status }) => !status.isInBlock, true),
          catchError((error) => {
            this.logger.error(error);
            return EMPTY;
          }))
        .subscribe((result) => {
          this.logTxResult(result, subscription);

          const feedCreatedEvent = result.events.find(
            ({ event }: EventRecord) => this.api.events.feeds.FeedCreated.is(event)
          );

          // TODO: handle case if transaction is included but no event found (may happe if API changes)
          if (feedCreatedEvent) {
            const { event } = feedCreatedEvent;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const feedId = (event as any).toJSON().data[0];
            this.logger.info(`New feed created: ${feedId}`);
            const feedIdAsU64 = this.api.createType('u64', feedId);
            resolve(feedIdAsU64);
          }
        });
    });
  }

  sendBalanceTx(from: SignerWithAddress, toAddress: string, amount: number): Promise<void> {
    const fromAddress = from.address;
    this.logger.info(`Sending balance ${amount} from ${fromAddress} to ${toAddress}`);
    return new Promise((resolve) => {
      const subscription = this.api.rx.tx.balances
        .transfer(toAddress, amount * Math.pow(10, 12))
        .signAndSend(fromAddress, { nonce: -1, signer: from }, Promise.resolve)
        .pipe(
          takeWhile(({ status }) => !status.isInBlock, true),
          catchError((error) => {
            this.logger.error(error);
            return EMPTY;
          }))
        .subscribe((result) => {
          this.logTxResult(result, subscription);

          if (result.status.isInBlock) {
            resolve();
          }
        });
    });
  }

  async getFeedId(signer: SignerWithAddress): Promise<U64> {
    const address = signer.address;
    this.logger.info(`Checking feed for ${address}`);

    const feedId = await this.state.getFeedIdByAddress(address);

    if (feedId) {
      // query chain state to check if there is an entry for this feedId
      const { isEmpty } = await this.api.query.feeds.feeds(feedId);

      // if it's not empty that means feedId exists both locally (in the feeds.json) and on the chain and we can re-use it
      if (!isEmpty) {
        const feedIdAsU64 = this.api.createType("U64", feedId);
        this.logger.info(`Feed already exists: ${feedIdAsU64}`);
        return feedIdAsU64;
      }

      // if feedId only exists locally, but not on the chain - we have to create a new one
      this.logger.error('Feed does not exist on the chain');
    }

    const newFeedId = await this.sendCreateFeedTx(signer);

    await this.state.saveFeedId(address, newFeedId);

    return newFeedId;
  }
}

export default Target;
