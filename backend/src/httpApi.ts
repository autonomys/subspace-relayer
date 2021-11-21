import fetch from "node-fetch";

import { blockToBinary, isInstanceOfSignedBlockJsonRpc } from './utils';
import { ChainName } from './types';
import { HexString } from "@polkadot/util/types";

export interface HttpApi {
    getLastFinalizedBlock(url: string): Promise<number>;
    getBlockByNumber(url: string, blockNumber: number): Promise<[HexString, Buffer]>;
    getChainName(url: string): Promise<ChainName>
}

export async function getLastFinalizedBlock(url: string): Promise<number> {
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

/**
 * @returns [blockHash, blockBytes]
 */
export async function getBlockByNumber(url: string, blockNumber: number): Promise<[HexString, Buffer]> {
    const blockHash: HexString = await fetch(url, {
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

    const block = await fetch(url, {
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

    return [blockHash, block];
}

export async function getChainName(url: string): Promise<ChainName> {
    return fetch(url, {
        method: "post",
        body: JSON.stringify({
            id: 1,
            jsonrpc: "2.0",
            method: "system_chain",
            params: [],
        }),
        headers: { "Content-Type": "application/json" },
    })
        .then(response => response.json())
        .then(body => {
            if (typeof body?.result !== 'string') {
                throw new Error(`Bad chain name response: ${JSON.stringify(body)}`);
            }

            return body.result as ChainName;
        });
}
