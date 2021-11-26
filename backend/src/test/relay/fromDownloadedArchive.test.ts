import * as tap from 'tap';
import { ApiPromise } from "@polkadot/api";

import { setup } from './common';
import { chainArchiveMock, blocksMock } from '../../mocks/chainArchive';

tap.test('Relay module - fromDownloadedArchive method', async (t) => {
  const {
    feedId,
    chainName,
    signer,
    initialLastProcessedBlock,
    Target,
    Relay,
    loggerMock,
    targetChainUrl,
    defaultRelayParams,
    relayWithDefaultParams,
  } = await setup();

  tap.test('should process blocks from archive and return last block number', async (t) => {
    const lastProcessedBlock = await relayWithDefaultParams.fromDownloadedArchive(
      feedId,
      chainName,
      initialLastProcessedBlock,
      signer,
      chainArchiveMock,
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
    const relay = new Relay({ ...defaultRelayParams, target: targetMock });

    const resultPromise = relay.fromDownloadedArchive(
      feedId,
      chainName,
      initialLastProcessedBlock,
      signer,
      chainArchiveMock
    )

    t.rejects(resultPromise, error);
  });

  tap.test('should retry if sending transaction fails');

  tap.test('should increase nonce if sending transaction fails in case error is caused by nonce used by other transaction');

  t.end();
})
