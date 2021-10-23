// Small utility that can download blocks from Substrate-based chain starting from genesis and store them by block
// number in a directory

import {ApiPromise, WsProvider} from "@polkadot/api";
import {RegistryTypes} from "@polkadot/types/types/registry";
import {compactToU8a} from "@polkadot/util";
import {firstValueFrom} from "rxjs";
import * as fs from "fs/promises";
// TODO: Types do not seem to match the code, hence usage of it like this
// eslint-disable-next-line @typescript-eslint/no-var-requires
const levelup = require("levelup");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rocksdb = require("rocksdb");
import { khala as khalaTypes } from '@phala/typedefs';
import { types as parallelTypes } from '@parallel-finance/type-definitions';
import { typeBundleForPolkadot as kilt } from '@kiltprotocol/type-definitions';
import kintsugiTypes from '@interlay/interbtc-types';

const REPORT_PROGRESS_INTERVAL = process.env.REPORT_PROGRESS_INTERVAL ? BigInt(process.env.REPORT_PROGRESS_INTERVAL) : 100n;

interface Block {
  header: {
    parentHash: string,
    number: string,
    stateRoot: string,
    extrinsicsRoot: string,
    digest: {
      logs: string[]
    },
  },
  extrinsics: string[],
}

interface SignedBlock {
  block: Block,
  justifications: null | string[],
}

function hexToUint8Array(hex: string): Uint8Array {
  return Buffer.from(hex.slice(2), 'hex');
}

function blockToBinary(block: SignedBlock): Uint8Array {
  const parentHash = hexToUint8Array(block.block.header.parentHash);
  const number = parseInt(block.block.header.number.slice(2), 16);
  const stateRoot = hexToUint8Array(block.block.header.stateRoot);
  const extrinsicsRoot = hexToUint8Array(block.block.header.extrinsicsRoot);
  const digest = block.block.header.digest.logs.map(hexToUint8Array);
  const extrinsics = block.block.extrinsics.map(hexToUint8Array);
  const justifications = block.justifications
    ? block.justifications.map(hexToUint8Array)
    : null;

  return Buffer.concat([
    parentHash,
    compactToU8a(number),
    stateRoot,
    extrinsicsRoot,
    compactToU8a(digest.length),
    ...digest,
    compactToU8a(extrinsics.length),
    ...extrinsics,
    ...(
      justifications
        ? [Uint8Array.of(1), compactToU8a(justifications.length), ...justifications]
        : [Uint8Array.of(0)]
    )
  ]);
}

(async () => {
  const sourceChainRpc = process.env.SOURCE_CHAIN_RPC;
  if (!sourceChainRpc) {
    console.error("SOURCE_CHAIN_RPC environment variable must be set with WS RPC URL");
    process.exit(1);
  }

  const targetDir = process.env.TARGET_DIR;
  if (!sourceChainRpc) {
    console.error("TARGET_DIR environment variable must be set with directory where downloaded blocks must be stored");
    process.exit(1);
  }

  console.info(`Connecting to RPC at ${sourceChainRpc}...`);
  const provider = new WsProvider(sourceChainRpc);
  let types;
  if (sourceChainRpc.includes('khala')) {
    // Khala
    types = khalaTypes;
  } else if (sourceChainRpc.includes('heiko')) {
    // Parallel Heiko
    types = parallelTypes;
  } else if (sourceChainRpc.includes('kilt')) {
    // Kilt Spiritnet
    types = kilt.types as unknown as RegistryTypes;
  } else if (sourceChainRpc.includes('basilisk')) {
    // Basilisk
    types = {
      AssetPair: { asset_in: 'AssetId', asset_out: 'AssetId' },
      Amount: 'i128',
      AmountOf: 'Amount',
      Address: 'AccountId',
      OrmlAccountData: { free: 'Balance', frozen: 'Balance', reserved: 'Balance' },
      Fee: { numerator: 'u32', denominator: 'u32' },
      BalanceInfo: { amount: 'Balance', assetId: 'AssetId' },
      Chain: { genesisHash: 'Vec<u8>', lastBlockHash: 'Vec<u8>' },
      Currency: 'AssetId',
      CurrencyId: 'AssetId',
      CurrencyIdOf: 'AssetId',
      Intention: {
        who: 'AccountId',
        asset_sell: 'AssetId',
        asset_buy: 'AssetId',
        amount: 'Balance',
        discount: 'bool',
        sell_or_buy: 'IntentionType'
      },
      IntentionId: 'Hash',
      IntentionType: { _enum: ['SELL', 'BUY'] },
      LookupSource: 'AccountId',
      Price: 'Balance',
      ClassId: 'u64',
      TokenId: 'u64',
      ClassData: { is_pool: 'bool' },
      TokenData: { locked: 'bool' },
      ClassInfo: { metadata: 'Vec<u8>', total_issuance: 'TokenId', owner: 'AccountId', data: 'ClassData' },
      TokenInfo: { metadata: 'Vec<u8>', owner: 'AccountId', data: 'TokenData' },
      ClassInfoOf: 'ClassInfo',
      TokenInfoOf: 'TokenInfo',
      ClassIdOf: 'ClassId',
      TokenIdOf: 'TokenId',
      OrderedSet: 'Vec<AssetId>',
      VestingSchedule: {
        start: 'BlockNumber',
        period: 'BlockNumber',
        period_count: 'u32',
        per_period: 'Compact<Balance>'
      },
      VestingScheduleOf: 'VestingSchedule',
      LBPAssetInfo: { id: 'AssetId', amount: 'Balance', initial_weight: 'LBPWeight', final_weight: 'LBPWeight' },
      LBPWeight: 'u128',
      WeightPair: { weight_a: 'LBPWeight', weight_b: 'LBPWeight' },
      WeightCurveType: { _enum: ['Linear'] },
      PoolId: 'AccountId',
      BalanceOf: 'Balance',
      AssetType: {
        _enum: {
          Token: 'Null',
          PoolShare: '(AssetId,AssetId)'
        }
      },
      Pool: {
        owner: 'AccountId',
        start: 'BlockNumber',
        end: 'BlockNumber',
        assets: 'AssetPair',
        initial_weights: 'WeightPair',
        final_weights: 'WeightPair',
        last_weight_update: 'BlockNumber',
        last_weights: 'WeightPair',
        weight_curve: 'WeightCurveType',
        pausable: 'bool',
        paused: 'bool',
        fee: 'Fee',
        fee_receiver: 'AccountId'
      },
      AssetNativeLocation: 'MultiLocation',
      AssetDetails: {
        name: 'Vec<u8>',
        asset_type: 'AssetType',
        existential_deposit: 'Balance',
        locked: 'bool'
      },
      AssetDetailsT: 'AssetDetails',
      AssetMetadata: { symbol: 'Vec<u8>', decimals: 'u8' },
      AssetInstance: 'AssetInstanceV1',
      MultiLocation: 'MultiLocationV1',
      MultiAsset: 'MultiAssetV1',
      Xcm: 'XcmV1',
      XcmOrder: 'XcmOrderV1'
    };
  } else if (sourceChainRpc === 'wss://api-kusama.interlay.io/parachain') {
    // Kintsugi BTC
    types = kintsugiTypes.types[0].types;
  }
  const api = await ApiPromise.create({
    provider,
    types,
  });

  console.log("Retrieving last finalized block...");

  let lastFinalizedBlockNumber = await (async () => {
    const finalizedBlockHash = await firstValueFrom(api.rx.rpc.chain.getFinalizedHead());
    const finalizedHeader = await firstValueFrom(api.rx.rpc.chain.getHeader(finalizedBlockHash));
    return finalizedHeader.number.toNumber();
  })();

  // Keep last finalized block up to date in the background
  api.rx.rpc.chain.subscribeFinalizedHeads().forEach((finalizedHead) => {
    lastFinalizedBlockNumber = finalizedHead.number.toNumber();
  });

  console.info(`Last finalized block is ${lastFinalizedBlockNumber}`);

  console.log(`Downloading blocks into ${targetDir}`);

  const db = levelup(rocksdb(`${targetDir}/db`));

  const lastDownloadedBlock = await (async () => {
    try {
      return BigInt(await fs.readFile(`${targetDir}/last-downloaded-block`, {encoding: 'utf-8'}));
    } catch {
      return -1n;
    }
  })();

  if (lastDownloadedBlock > -1) {
    console.info(`Continuing downloading from block ${lastDownloadedBlock + 1n}`);
  }

  let lastDownloadingReportAt;
  let blockNumber = lastDownloadedBlock + 1n

  for (; blockNumber <= lastFinalizedBlockNumber; ++blockNumber) {
    const blockHash = await firstValueFrom(api.rx.rpc.chain.getBlockHash(blockNumber));
    const blockRaw = await firstValueFrom(api.rx.rpc.chain.getBlock.raw(blockHash)) as SignedBlock;
    const blockBytes = blockToBinary(blockRaw);

    await db.put(Buffer.from(BigUint64Array.of(blockNumber).buffer), Buffer.from(blockBytes));

    if (blockNumber % REPORT_PROGRESS_INTERVAL === 0n) {
      const now = Date.now();
      const downloadRate = lastDownloadingReportAt
        ? ` (${(Number(REPORT_PROGRESS_INTERVAL) / ((now - lastDownloadingReportAt) / 1000)).toFixed(2)} blocks/s)`
        : "";
      lastDownloadingReportAt = now;

      console.info(
        `Downloaded block ${blockNumber}/${lastFinalizedBlockNumber}${downloadRate}`
      );

      await fs.writeFile(`${targetDir}/last-downloaded-block`, blockNumber.toString());
    }
  }

  console.info("Archived everything");

  await fs.writeFile(`${targetDir}/last-downloaded-block`, blockNumber.toString());

  process.exit(0);
})();
