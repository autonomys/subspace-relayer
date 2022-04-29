import { compactToU8a } from "@polkadot/util";
import { EventRecord, Event } from "@polkadot/types/interfaces/system";
import { PolkadotPrimitivesV2CandidateReceipt } from "@polkadot/types/lookup";
import { ApiPromise, WsProvider } from "@polkadot/api";
import pRetry, { FailedAttemptError, Options as pRetryOptions } from "p-retry";
import { Logger } from "pino";

import { ParaHeadAndId, SignedBlockJsonRpc, ChainId, FinalityProof } from "./types";

// TODO: implement tests
export const getParaHeadAndIdFromEvent = (event: Event): ParaHeadAndId => {
    // We know its contents here, no idea how to extract types in a more correct way
    const { descriptor } = event.data[0] as PolkadotPrimitivesV2CandidateReceipt;

    return {
        blockHash: descriptor.paraHead.toHex(),
        // We know that parachain ID will not exceed 53-bit size integer
        paraId: Number(descriptor.paraId.toBigInt()) as ChainId
    };
};

export const isIncludedParablockRecord =
    (index: number) =>
        ({ phase, event }: EventRecord): boolean => {
            return (
                // filter the specific events based on the phase and then the
                // index of our extrinsic in the block
                phase.isApplyExtrinsic &&
                phase.asApplyExtrinsic.eq(index) &&
                event.section == "paraInclusion" &&
                event.method == "CandidateIncluded"
            );
        };

function hexToUint8Array(hex: string): Uint8Array {
    return Buffer.from(hex.slice(2), 'hex');
}

export function blockToBinary(block: SignedBlockJsonRpc): Buffer {
    const parentHash = hexToUint8Array(block.block.header.parentHash);
    const number = parseInt(block.block.header.number.slice(2), 16);
    const stateRoot = hexToUint8Array(block.block.header.stateRoot);
    const extrinsicsRoot = hexToUint8Array(block.block.header.extrinsicsRoot);
    const digest = block.block.header.digest.logs.map(hexToUint8Array);
    const extrinsics = block.block.extrinsics.map(hexToUint8Array);
    const blockJustifications = block.justifications
        // converting number[][] to Uint8Array[][]
        ? block.justifications.map(js => js.map(j => new Uint8Array(j)))
        : null;


    const justifications = blockJustifications
        ? [
            Uint8Array.of(1),
            compactToU8a(blockJustifications.length),
            blockJustifications[0][0], // engine ID
            compactToU8a(blockJustifications[0][1].length),
            blockJustifications[0][1], // justification
        ]
        : [Uint8Array.of(0)];

    return Buffer.concat([
        parentHash,
        compactToU8a(number),
        stateRoot,
        extrinsicsRoot,
        compactToU8a(digest.length),
        ...digest,
        compactToU8a(extrinsics.length),
        ...extrinsics,
        ...justifications
    ]);
}

// disable eslint rules and allow 'any' because we're checking API response
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export function isInstanceOfSignedBlockJsonRpc(object: any): object is SignedBlockJsonRpc {
    return (
        object &&
        'block' in object &&
        'justifications' in object &&
        Array.isArray(object.block.extrinsics) &&
        Array.isArray(object.block.header.digest.logs) &&
        typeof object.block.header.parentHash === 'string' &&
        typeof object.block.header.number === 'string' &&
        typeof object.block.header.stateRoot === 'string' &&
        typeof object.block.header.extrinsicsRoot === 'string' &&
        typeof object.block.header.parentHash === 'string'
    );
}

export function createApi(url: string | string[]): Promise<ApiPromise> {
    const TIMEOUT_MS = 90 * 1000;
    const provider = new WsProvider(url, undefined, undefined, TIMEOUT_MS);
    const originalSend = provider.send;

    // TODO: This is an ugly workaround for https://github.com/polkadot-js/api/issues/4414
    provider.send = function (
        method: string,
        params: unknown[],
        _isCachable?: boolean,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subscription?: any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): Promise<any> {
        return originalSend.call(this, method, params, false, subscription);
    };
    return ApiPromise.create({
        provider,
        types: {
            // necessary for decoding results of api.rpc.grandpa.proveFinality
            FinalityProof: {
                block: "BlockHash",
                justification: "Vec<u8>",
                uknownHeaders: "Vec<Header>"
            }
        }
    });
}

export function blockNumberToBuffer(blockNumber: number): Buffer {
    return Buffer.from(BigUint64Array.of(BigInt(blockNumber)).buffer);
}

export const createRetryOptions = (onFailedAttempt: ((error: FailedAttemptError) => void | Promise<void>)): pRetryOptions => ({
    randomize: true,
    forever: true,
    minTimeout: 1000,
    maxTimeout: 60 * 60 * 1000,
    onFailedAttempt,
});

export const GRANDPA_ENGINE_ID = [70, 82, 78, 75]; // FRNK

export async function withGrandpaJustification(api: ApiPromise, logger: Logger, rawBlock: SignedBlockJsonRpc): Promise<SignedBlockJsonRpc> {
    // adding justifications from finality proof if there is none
    if (!rawBlock.justifications) {
        const { number } = rawBlock.block.header;
        const proof = await pRetry(
            () => api.rpc.grandpa.proveFinality(number),
            createRetryOptions(error => logger.error(error, `get block justifications for #${number} retry error:`)),
        );
        const proofBytes = proof.toU8a(true);
        const decodedProof = api.createType("FinalityProof", proofBytes);
        const justificationBytes = (decodedProof as unknown as FinalityProof).justification.toU8a(true);

        rawBlock.justifications = [[GRANDPA_ENGINE_ID, Array.from(justificationBytes)]];
    }

    return rawBlock;
}
