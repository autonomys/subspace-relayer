import { compactFromU8a, compactToU8a, u8aToHex } from "@polkadot/util";
import { EventRecord, Event } from "@polkadot/types/interfaces/system";
import { AddressOrPair } from "@polkadot/api/submittable/types";

import { ParaHeadAndId, ParachainConfigType, ChainName, TxData, ParachainsMap, TxDataInput, SignedBlockJsonRpc } from "./types";
import Parachain from "./parachain";
import Target from "./target";
import logger from "./logger";

// TODO: implement tests
export const getParaHeadAndIdFromEvent = (event: Event): ParaHeadAndId => {
    // use 'any' because this is not typed array - element can be number, string or Record<string, unknown>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { paraHead, paraId } = (event.toJSON().data as Array<any>)[0]
        .descriptor;

    return { paraHead, paraId };
};

// TODO: more explicit function name
export const isRelevantRecord =
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

export const createParachainsMap = async (
    target: Target,
    configParachains: ParachainConfigType[],
    signers: AddressOrPair[],
): Promise<ParachainsMap> => {
    const map = new Map();

    for (const [index, { url, chain, paraId }] of configParachains.entries()) {
        const signer = signers[index];
        const feedId = await target.getFeedId(signer);
        const parachain = new Parachain({ feedId, url, chain: chain as ChainName, logger, signer });
        map.set(paraId, parachain);
    }

    // TODO: investigate why this code results in Uknown paraId error
    // configParachains.forEach(async ({ url, chain, paraId }, index) => {
    //     const signer = signers[index];
    //     const feedId = await target.sendCreateFeedTx(signer);
    //     const parachain = new Parachain({ feedId, url, chain: chain as ChainName, logger, signer });
    //     map.set(paraId, parachain);
    // });

    return map;
};

export const toBlockTxData = ({ block, number, hash, feedId, chain, signer }: TxDataInput): TxData => ({
    feedId,
    block,
    chain,
    signer,
    metadata: {
        hash,
        number,
    },
});

function hexToUint8Array(hex: string): Uint8Array {
    return Buffer.from(hex.slice(2), 'hex');
}

export function blockToBinary(block: SignedBlockJsonRpc): Uint8Array {
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

export function jsonBlockToHex(block: SignedBlockJsonRpc): `0x${string}` {
    return u8aToHex(blockToBinary(block));
}

// disable eslint rules and allow 'any' because we're checking API response
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export function isInstanceOfSignedBlockJsonRpc(object: any): object is SignedBlockJsonRpc {
    return 'block' in object &&
        'justifications' in object &&
        Array.isArray(object.block.extrinsics) &&
        Array.isArray(object.block.header.digest.logs) &&
        typeof object.block.header.parentHash === 'string' &&
        typeof object.block.header.number === 'string' &&
        typeof object.block.header.stateRoot === 'string' &&
        typeof object.block.header.extrinsicsRoot === 'string' &&
        typeof object.block.header.parentHash === 'string';
}

enum DigestItemType {
    Other = 0,
    ChangesTrieRoot = 2,
    Consensus = 4,
    Seal = 5,
    PreRuntime = 6,
    ChangesTrieSignal = 7,
    RuntimeEnvironmentUpdated = 8,
}

/**
 * Returns number of bytes occupied at the beginning of the block by the header
 */
export function getHeaderLength(block: Uint8Array): number {
    // TODO: Assumes every chain has exactly 32 bytes hash size, which might not be the case (check all para chains and
    //  remove this todo if this is in fact true)
    const hashLength = 32;
    const parentHashLength = hashLength;
    const [numberLength] = compactFromU8a(block.subarray(parentHashLength));
    const stateRootLength = hashLength;
    const extrinsicsRoot = hashLength;
    let digestLength;
    {
        const digest = block.subarray(
            numberLength +
            parentHashLength +
            stateRootLength +
            extrinsicsRoot
        );
        const [digestLogsOffset, digestLogsCount] = compactFromU8a(digest);

        digestLength = digestLogsOffset;

        for (let i = 0; i < digestLogsCount.toNumber(); i++) {
            const digestItemType = digest[digestLength];
            digestLength += 1;

            switch (digestItemType) {
                case DigestItemType.Other: {
                    // Some bytes
                    const [offset, length] = compactFromU8a(digest.subarray(digestLength));
                    digestLength += offset + length.toNumber();
                    break;
                }
                case DigestItemType.ChangesTrieRoot: {
                    digestLength += hashLength;
                    break;
                }
                case DigestItemType.Consensus:
                case DigestItemType.Seal:
                case DigestItemType.PreRuntime: {
                    // Consensus engine ID
                    digestLength += 4;
                    // Some bytes
                    const [offset, length] = compactFromU8a(digest.subarray(digestLength));
                    digestLength += offset + length.toNumber();
                    break;
                }
                case DigestItemType.ChangesTrieSignal: {
                    // `1` for `ChangesTrieSignal` enum variant
                    // `1` for `Option<ChangesTrieConfiguration>`
                    // `8` for `ChangesTrieConfiguration`
                    digestLength += 1 + 1 + 8;
                    break;
                }
                case DigestItemType.RuntimeEnvironmentUpdated:
                    // No data here
                    break;
            }
        }
    }

    return parentHashLength + numberLength + stateRootLength + extrinsicsRoot + digestLength;
}
