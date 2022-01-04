import { compactToU8a } from "@polkadot/util";
import { EventRecord, Event } from "@polkadot/types/interfaces/system";
import { PolkadotPrimitivesV1CandidateReceipt } from "@polkadot/types/lookup";
import { ApiPromise, WsProvider } from "@polkadot/api";

import { ParaHeadAndId, SignedBlockJsonRpc, ChainId } from "./types";

// TODO: implement tests
export const getParaHeadAndIdFromEvent = (event: Event): ParaHeadAndId => {
    // We know its contents here, no idea how to extract types in a more correct way
    const { descriptor } = event.data[0] as PolkadotPrimitivesV1CandidateReceipt;

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
    const provider = new WsProvider(url);
    const originalSend = provider.send;

    // TODO: This is an ugly workaround for https://github.com/polkadot-js/api/issues/4414
    provider.send = function(
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
    });
}

export function blockNumberToBuffer(blockNumber: number): Buffer {
    return Buffer.from(BigUint64Array.of(BigInt(blockNumber)).buffer);
}
