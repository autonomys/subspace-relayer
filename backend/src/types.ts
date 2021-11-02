import { U64 } from "@polkadot/types/primitive";
import { Hash } from "@polkadot/types/interfaces";
import { AddressOrPair } from "@polkadot/api/submittable/types";

import Parachain from "./parachain";

export type ChainName = Brand<string, 'chain'>;

export interface TxData {
  feedId: U64;
  block: string;
  metadata: Metadata;
  chain: ChainName;
  signer: AddressOrPair;
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
  // TODO: get chain name from api
  chain: string;
}

export type ParachainsMap = Map<string, Parachain>;

export interface TxDataInput {
  block: string;
  number: number;
  hash: Hash;
  feedId: U64;
  chain: ChainName;
  signer: AddressOrPair;
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
