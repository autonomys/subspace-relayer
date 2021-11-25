import fetch from "node-fetch";

import { blockToBinary, isInstanceOfSignedBlockJsonRpc } from './utils';
import { ChainName } from './types';
import { HexString } from "@polkadot/util/types";

export default class HttpApi {
    private readonly url: string;

    public constructor(url: string) {
        this.url = url;
    }

    public async getLastFinalizedBlock(): Promise<number> {
        const blockHash: string = await fetch(this.url, {
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

        return fetch(this.url, {
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
    public async getBlockByNumber(blockNumber: number): Promise<[HexString, Buffer]> {
        const blockHash: HexString = await fetch(this.url, {
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

        const block = await fetch(this.url, {
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

    public async getChainName(): Promise<ChainName> {
        return fetch(this.url, {
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
}
