import { ApiPromise } from "@polkadot/api";
import { SignerOptions } from "@polkadot/api/types";
import { Callback, ISubmittableResult } from '@polkadot/types/types';
import { HexString } from "@polkadot/util/types";
import * as signedBlockMock from '../mocks/signedBlock.json';

export const createMockPutWithResult = (result: ISubmittableResult): ApiPromise => ({
  tx: {
    feeds: {
      put() {
        return {
          signAndSend(_account: string, _options: SignerOptions, statusCallback: Callback<ISubmittableResult>) {
            statusCallback(result)
          }
        }
      }
    },
    utility: {
      batchAll() {
        return {
          signAndSend(_account: string, _options: SignerOptions, statusCallback: Callback<ISubmittableResult>) {
            statusCallback(result)
          }
        }
      }
    },
  },
  rpc: {
    system: {
      accountNextIndex() {
        return {
          toBigInt() {
            return BigInt(0);
          }
        }
      }
    },
    chain: {
      getBlockHash() {
        return Promise.resolve('0xHash' as HexString);
      },
      getBlock: {
        raw() {
          return Promise.resolve(signedBlockMock);
        }
      }
    }
  }
}) as unknown as ApiPromise;
