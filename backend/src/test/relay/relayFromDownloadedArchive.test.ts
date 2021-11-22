import * as tap from 'tap';
import { ApiPromise } from "@polkadot/api";

import { setup } from './common';

tap.test('Relay module - relayFromDownloadedArchive method', async (t) => {
  const {
    relay,
    feedId,
    chainName,
    signer,
    initialLastProcessedBlock,
    chainArchive,
    blocksMock,
    Target,
    Relay,
    loggerMock,
    targetChainUrl,
    defaultRelayParams,
  } = await setup();

  tap.test('should process blocks from archive and return last block number', async (t) => {
    const relay = new Relay({ ...defaultRelayParams, archive: chainArchive });

    const lastProcessedBlock = await relay.relayFromDownloadedArchive(
      feedId,
      chainName,
      initialLastProcessedBlock,
      signer,
    );

    t.equal(lastProcessedBlock, blocksMock.length);
  });

  tap.test('should reject if API fails to get nonce', async (t) => {
    const error = new Error('Failed to get nonce');
    const api = {
      rpc: {
        system: {
          accountNextIndex() {
            return {
              toBigInt() {
                throw error;
              }
            }
          }
        }
      }
    } as unknown as ApiPromise;

    const targetMock = new Target({ api, logger: loggerMock, targetChainUrl });
    const relay = new Relay({ ...defaultRelayParams, target: targetMock, archive: chainArchive });

    const resultPromise = relay.relayFromDownloadedArchive(
      feedId,
      chainName,
      initialLastProcessedBlock,
      signer,
    )

    t.rejects(resultPromise, error);
  });

  tap.test('should throw an error if no archive provided', async (t) => {
    t.rejects(relay.relayFromDownloadedArchive(
      feedId,
      chainName,
      initialLastProcessedBlock,
      signer,
    ))
  });

  tap.test('should retry if sending transaction fails');

  tap.test('should increase nonce if sending transaction fails in case error is caused by nonce used by other transaction');

  t.end();
})
