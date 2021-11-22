import * as tap from 'tap';
import { TypeRegistry } from '@polkadot/types';
import { ISubmittableResult } from '@polkadot/types/types';
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { ApiPromise } from "@polkadot/api";

import ChainArchive from "../chainArchive";
import loggerMock from '../mocks/logger';
import { createDbMock } from '../mocks/db';
import * as signedBlockMock from '../mocks/signedBlock.json';
import { createHttpApiMock } from '../mocks/httpApi';
import Relay from "../relay";
import Target from "../target";
import {
  TxBlock,
  ChainName
} from '../types';
import { blockToBinary } from '../utils';
import { createMockPutWithResult } from '../mocks/api';
import { PoolSigner } from "../poolSigner";

tap.test('Relay module', async (t) => {
  const blocksMock = [
    blockToBinary(signedBlockMock),
    blockToBinary(signedBlockMock),
    blockToBinary(signedBlockMock),
  ]
  const dbMock = createDbMock(blocksMock);
  const chainArchive = new ChainArchive({ logger: loggerMock, db: dbMock });
  const initialLastProcessedBlock = 0;
  const batchBytesLimit = 3_500_000;
  const batchCountLimit = 2;
  const targetChainUrl = 'random url';
  const registry = new TypeRegistry();
  const putSuccessResult = {
    isError: false,
    status: {
      isInBlock: true,
      asInBlock: registry.createType('Hash', '0xde8f69eeb5e065e18c6950ff708d7e551f68dc9bf59a07c52367c0280f805ec7'),
    }
  } as unknown as ISubmittableResult;
  const apiSuccess = createMockPutWithResult(putSuccessResult);
  const targetMock = new Target({ api: apiSuccess, logger: loggerMock, targetChainUrl });
  const finalizedBlockNumber = 2;
  const httpApiMock = createHttpApiMock({
    blocks: blocksMock,
    finalizedBlock: finalizedBlockNumber,
  })
  const defaultRelayParams = {
    logger: loggerMock,
    archive: chainArchive,
    target: targetMock,
    httpApi: httpApiMock,
    batchBytesLimit,
    batchCountLimit,
  };
  const relay = new Relay(defaultRelayParams);
  await cryptoWaitReady();
  const signer = new PoolSigner(
    registry,
    'random account seed',
    1,
  );
  const feedId = registry.createType('u64', 10);
  const chainName = 'Cool chain' as ChainName;

  tap.test('relayFromDownloadedArchive method should process blocks from archive and return last block number', async (t) => {
    const lastProcessedBlock = await relay.relayFromDownloadedArchive(
      feedId,
      chainName,
      initialLastProcessedBlock,
      signer,
    );

    t.equal(lastProcessedBlock, blocksMock.length);
  });

  tap.test('relayFromDownloadedArchive method should reject if API fails to get nonce', async (t) => {
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

    const resultPromise = relay.relayFromDownloadedArchive(
      feedId,
      chainName,
      initialLastProcessedBlock,
      signer,
    )

    t.rejects(resultPromise, error);
  });

  tap.test('relayFromDownloadedArchive method should retry if sending transaction fails');

  tap.test('relayFromDownloadedArchive method should increase nonce if sending transaction fails in case error is caused by nonce used by other transaction');

  tap.test('relayFromDownloadedArchive should throw an error if no archive provided');

  tap.test('readBlocksInBatches method should return AsyncGenerator with batch of TxBlock items and last block number', async (t) => {
    const batchesGenerator = relay.readBlocksInBatches(initialLastProcessedBlock);

    for await (const [blocks, lastBlockNumber] of batchesGenerator) {
      t.ok(blocks.length <= batchCountLimit);
      t.type(blocks[0].block, Buffer);
      t.type(blocks[0].metadata, Buffer);
      // should be greater than zero if batch has items
      t.ok(lastBlockNumber);
    }
  });

  tap.test('readBlocksInBatches should yield last block number equal to the block number of the last block in the batch', async (t) => {
    const batchesGenerator = relay.readBlocksInBatches(initialLastProcessedBlock);

    {
      const first = await batchesGenerator.next();
      t.notOk(first.done);
      const [blocks, number] = (first.value as [TxBlock[], number]);
      // total number of blocks is 3, batch count limit is 2 - we expect 2 blocks
      t.equal(blocks.length, 2);
      t.equal(number, 2);
    }

    {
      const second = await batchesGenerator.next();
      t.notOk(second.done);
      const [blocks, number] = (second.value as [TxBlock[], number]);
      // 1 out of 3 blocks left
      t.equal(blocks.length, 1);
      t.equal(number, 3);
    }

    // no more blocks in archive
    const third = await batchesGenerator.next();
    t.ok(third.done);
    t.notOk(third.value);
  });

  tap.test('readBlocksInBatches should fit maximum number of blocks within size limit', async (t) => {
    {
      // we know that blocks in mock + metadata are 123 bytes each
      const batchBytesLimit = 130;
      const relay = new Relay({
        ...defaultRelayParams,
        batchBytesLimit,
      });
      const batchesGenerator = relay.readBlocksInBatches(initialLastProcessedBlock);

      // only one block can fit
      for await (const [blocks] of batchesGenerator) {
        t.equal(blocks.length, 1);
      }
    }

    {
      const batchBytesLimit = 300;
      const relay = new Relay({
        ...defaultRelayParams,
        batchBytesLimit,
      });
      const batchesGenerator = relay.readBlocksInBatches(initialLastProcessedBlock);

      const first = await batchesGenerator.next();
      t.notOk(first.done);
      const [firstBatch] = (first.value as [TxBlock[], number]);
      // two blocks can fit
      t.equal(firstBatch.length, 2);

      const second = await batchesGenerator.next();
      t.notOk(second.done);
      const [secondBatch] = (second.value as [TxBlock[], number]);
      // only one block left
      t.equal(secondBatch.length, 1);
    }
  });

  tap.test('fetchBlocksInBatches method should return AsyncGenerator with batch of TxBlock items and next block number', async (t) => {
    const httpUrl = 'random url';
    const nextBlockToProcess = 0;
    const lastFinalizedBlockNumber = () => finalizedBlockNumber;

    const batchesGenerator = relay.fetchBlocksInBatches(
      httpUrl,
      nextBlockToProcess,
      lastFinalizedBlockNumber,
    );

    for await (const [blocks, lastBlockNumber] of batchesGenerator) {
      t.ok(blocks.length <= batchCountLimit);
      t.type(blocks[0].block, Buffer);
      t.type(blocks[0].metadata, Buffer);
      // should be greater than zero if batch has items
      t.ok(lastBlockNumber);
    }
  });

  tap.test('fetchBlocksInBatches should yield block number next to the block number of the block in the batch', async (t) => {
    const httpUrl = 'random url';
    const nextBlockToProcess = 0;
    const lastFinalizedBlockNumber = () => finalizedBlockNumber;

    const batchesGenerator = relay.fetchBlocksInBatches(
      httpUrl,
      nextBlockToProcess,
      lastFinalizedBlockNumber,
    );

    {
      const first = await batchesGenerator.next();
      t.notOk(first.done);
      const [blocks, nextBlockNumber] = (first.value as [TxBlock[], number]);
      // total number of blocks is 3, batch count limit is 2 - we expect 2 blocks
      t.equal(blocks.length, 2);
      // TODO: clarify why is not 2
      t.equal(nextBlockNumber, 1);
    }

    {
      const second = await batchesGenerator.next();
      t.notOk(second.done);
      const [blocks, nextBlockNumber] = (second.value as [TxBlock[], number]);
      // 1 out of 3 blocks left
      t.equal(blocks.length, 1);
      t.equal(nextBlockNumber, 3);
    }

    // no more blocks to fetch
    const third = await batchesGenerator.next();
    t.ok(third.done);
    t.notOk(third.value);
  });

  tap.test('fetchBlocksInBatches should fit maximum number of blocks within size limit', async (t) => {
    {
      // we know that blocks in mock + metadata are 132 bytes each
      const batchBytesLimit = 140;
      const relay = new Relay({
        ...defaultRelayParams,
        batchBytesLimit,
      });
      const httpUrl = 'random url';
      const nextBlockToProcess = 0;
      const lastFinalizedBlockNumber = () => finalizedBlockNumber;

      const batchesGenerator = relay.fetchBlocksInBatches(
        httpUrl,
        nextBlockToProcess,
        lastFinalizedBlockNumber,
      );

      // only one block can fit
      for await (const [blocks] of batchesGenerator) {
        t.equal(blocks.length, 1);
      }
    }

    {
      const batchBytesLimit = 300;
      const relay = new Relay({
        ...defaultRelayParams,
        batchBytesLimit,
      });
      const httpUrl = 'random url';
      const nextBlockToProcess = 0;
      const lastFinalizedBlockNumber = () => finalizedBlockNumber;

      const batchesGenerator = relay.fetchBlocksInBatches(
        httpUrl,
        nextBlockToProcess,
        lastFinalizedBlockNumber,
      );

      const first = await batchesGenerator.next();
      t.notOk(first.done);
      const [firstBatch] = (first.value as [TxBlock[], number]);
      // two blocks can fit
      t.equal(firstBatch.length, 2);

      const second = await batchesGenerator.next();
      t.notOk(second.done);
      const [secondBatch] = (second.value as [TxBlock[], number]);
      // only one block left
      t.equal(secondBatch.length, 1);
    }
  });

  tap.test('fetchBlocksInBatches method should retry if get block over HTTP API fails');

  t.end();
})
