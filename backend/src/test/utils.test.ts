import * as tap from 'tap';
import { Event } from "@polkadot/types/interfaces/system";

import { getParaHeadAndIdFromEvent } from '../utils';

tap.test('Utils module', (t) => {
    tap.test('getParaHeadAndIdFromEvent should return parablock hash and paraId', (t) => {
        const paraId = 2088;
        const paraHead = "0x2980ff352ab0fab013f01b3757d2fbbadf8fbdd510883cb03b111b03f358bff3";
        const descriptor = {
            paraId: {
                toBigInt() {
                    return BigInt(paraId)
                }
            },
            paraHead: {
                toHex() {
                    return paraHead;
                }
            },
        }

        const event = {
            data: [{ descriptor }]
        }

        const result = getParaHeadAndIdFromEvent(event as unknown as Event);

        t.same(result, { blockHash: paraHead, paraId });

        t.end()
    });

    tap.test('isIncludedParablockRecord should return "true" if EventRecord matches phase index, section and method');

    tap.test('hexToUint8Array should accept hex string and return Uint8Array');

    tap.test('blockToBinary should convert SignedBlockJsonRpc to Buffer');

    tap.test('isInstanceOfSignedBlockJsonRpc should return "true" if object is an instance of SignedBlockJsonRpc');

    t.end();

})
