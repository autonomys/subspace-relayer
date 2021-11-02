import fetch from "node-fetch";

import { blockToBinary, isInstanceOfSignedBlockJsonRpc } from './utils';

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

export async function getBlockByNumber(url: string, blockNumber: number): Promise<Uint8Array> {
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

export async function getChainName(url: string): Promise<string> {
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

            return body.result;
        });
}
