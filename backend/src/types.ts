import { U64 } from "@polkadot/types/primitive";
import { Hash } from "@polkadot/types/interfaces";
import { Signer, SignerPayloadJSON, SignerResult } from "@polkadot/types/types/extrinsic";

import Parachain from "./parachain";

export type ChainName = Brand<string, 'chain'>;

export abstract class SignerWithAddress implements Signer {
  protected constructor(
    public readonly address: string,
  ) {
  }

  abstract signPayload(payload: SignerPayloadJSON): Promise<SignerResult>;
}

export interface TxData {
  feedId: U64;
  block: string;
  metadata: Metadata;
  chain: ChainName;
  signer: SignerWithAddress;
}

interface Metadata {
  hash: Hash;
  number: number;
}

export interface ParaHeadAndId {
  paraId: string;
  paraHead: Hash;
}

export type Brand<K, T> = K & { __brand: T; };

export interface ParachainConfigType {
  url: string;
  paraId: number;
}

export type ParachainsMap = Map<string, Parachain>;

export interface TxDataInput {
  block: string;
  number: number;
  hash: Hash;
  feedId: U64;
  chain: ChainName;
  signer: SignerWithAddress;
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
  justifications: null | string[],
}
