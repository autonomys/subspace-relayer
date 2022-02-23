import { Signer, SignerPayloadJSON, SignerResult } from "@polkadot/types/types/extrinsic";
import { HexString } from "@polkadot/util/types";

type Brand<K, T> = K & { __brand: T; };

export type ChainName = Brand<string, 'ChainName'>;
export type ChainId = Brand<number, 'ChainId'>;

export abstract class SignerWithAddress implements Signer {
  protected constructor(
    public readonly address: string,
  ) {
  }

  abstract signPayload(payload: SignerPayloadJSON): Promise<SignerResult>;
}

export interface BlockMetadata {
  hash: HexString;
  number: number;
}

export interface TxBlock {
  block: Buffer;
  metadata: Buffer;
  proof?: Uint8Array;
}

export interface ParaHeadAndId {
  paraId: ChainId;
  blockHash: HexString;
}

export interface ParachainConfigType {
  url: string;
  paraId: number;
}

interface BlockJsonRpc {
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

export interface SignedBlockJsonRpc {
  block: BlockJsonRpc,
  justifications: null | number[][][],
}
