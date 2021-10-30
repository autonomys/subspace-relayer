// Small utility that can download blocks from Substrate-based chain starting from genesis and store them by block
// number in a directory

import * as fs from "fs/promises";
// TODO: Types do not seem to match the code, hence usage of it like this
// eslint-disable-next-line @typescript-eslint/no-var-requires
const levelup = require("levelup");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rocksdb = require("rocksdb");
import fetch from "node-fetch";

import {blockToBinary, isInstanceOfSignedBlockJsonRpc} from '../utils';

const REPORT_PROGRESS_INTERVAL = process.env.REPORT_PROGRESS_INTERVAL
  ? parseInt(process.env.REPORT_PROGRESS_INTERVAL, 10)
  : 100;

async function getLastFinalizedBlock(url: string): Promise<number> {
  const blockHash: string = await fetch(url, {
    method: "post",
    body: JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "chain_getFinalizedHead",
      params: [],
    }),
    headers: { "Content-Type": "application/json" },
  })
    .then(response => response.json())
    .then(body => {
      if (typeof body?.result !== 'string') {
        throw new Error(`Bad finalized head response: ${JSON.stringify(body)}`);
      }

      return body.result;
    });

  return fetch(url, {
    method: "post",
    body: JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "chain_getHeader",
      params: [blockHash],
    }),
    headers: { "Content-Type": "application/json" },
  })
    .then(response => response.json())
    .then(body => {
      if (typeof body?.result?.number !== 'string') {
        throw new Error(`Bad header response: ${JSON.stringify(body)}`);
      }

      return parseInt(body.result.number.slice(2), 16);
    });
}

async function getBlock(url: string, blockNumber: number): Promise<Uint8Array> {
  const blockHash: string = await fetch(url, {
    method: "post",
    body: JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "chain_getBlockHash",
      params: [blockNumber],
    }),
    headers: { "Content-Type": "application/json" },
  })
    .then(response => response.json())
    .then(body => {
      if (typeof body?.result !== 'string') {
        throw new Error(`Bad block hash response: ${JSON.stringify(body)}`);
      }

      return body.result;
    });

  return fetch(url, {
    method: "post",
    body: JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "chain_getBlock",
      params: [blockHash],
    }),
    headers: { "Content-Type": "application/json" },
  })
    .then(response => response.json())
    .then(body => {
      if (!isInstanceOfSignedBlockJsonRpc(body?.result)) {
        throw new Error(`Bad block response: ${JSON.stringify(body)}`);
      }

      return blockToBinary(body.result);
    });
}

(async () => {
  const sourceChainRpc = process.env.SOURCE_CHAIN_RPC;
  if (!(sourceChainRpc && sourceChainRpc.startsWith('http'))) {
    console.error("SOURCE_CHAIN_RPC environment variable must be set with HTTP RPC URL");
    process.exit(1);
  }

  const targetDir = process.env.TARGET_DIR;
  if (!sourceChainRpc) {
    console.error("TARGET_DIR environment variable must be set with directory where downloaded blocks must be stored");
    process.exit(1);
  }

  console.log("Retrieving last finalized block...");

  const lastFinalizedBlockNumber = await getLastFinalizedBlock(sourceChainRpc);

  console.info(`Last finalized block is ${lastFinalizedBlockNumber}`);

  console.log(`Downloading blocks into ${targetDir}`);

  const db = levelup(rocksdb(`${targetDir}/db`));

  const lastDownloadedBlock = await (async () => {
    try {
      return parseInt(await fs.readFile(`${targetDir}/last-downloaded-block`, { encoding: 'utf-8' }), 10);
    } catch {
      return -1;
    }
  })();

  if (lastDownloadedBlock > -1) {
    console.info(`Continuing downloading from block ${lastDownloadedBlock + 1}`);
  }

  let lastDownloadingReportAt;
  let blockNumber = lastDownloadedBlock + 1;

  for (; blockNumber <= lastFinalizedBlockNumber; ++blockNumber) {
    const blockBytes = await getBlock(sourceChainRpc, blockNumber);

    await db.put(Buffer.from(BigUint64Array.of(BigInt(blockNumber)).buffer), Buffer.from(blockBytes));

    if (blockNumber % REPORT_PROGRESS_INTERVAL === 0) {
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
