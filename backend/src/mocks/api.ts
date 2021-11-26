import { ApiPromise } from "@polkadot/api";
import { SignerOptions } from "@polkadot/api/types";
import { Callback, ISubmittableResult } from '@polkadot/types/types';

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
    rpc: {
      system: {
        accountNextIndex() {
          return {
            toBigInt() {
              return BigInt(0);
            }
          }
        }
      }
    }
  }
}) as unknown as ApiPromise;
