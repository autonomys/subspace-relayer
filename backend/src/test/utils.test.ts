import * as tap from 'tap';
import { Event, EventRecord } from "@polkadot/types/interfaces/system";

import { getParaHeadAndIdFromEvent, isIncludedParablockRecord, isInstanceOfSignedBlockJsonRpc, blockToBinary } from '../utils';
import * as signedBlockMock from '../mocks/signedBlock.json';

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

    t.end();
  });

  tap.test('blockToBinary should convert SignedBlockJsonRpc to Buffer', (t) => {
    const result = blockToBinary(signedBlockMock);

    const expected = Buffer.from([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 154, 201,
      57, 234, 71, 34, 209, 252, 247, 244, 135, 54, 117, 4,
      14, 188, 131, 209, 68, 98, 12, 118, 32, 109, 190, 183,
      70, 140, 243, 12, 223, 3, 23, 10, 46, 117, 151, 183,
      183, 227, 216, 76, 5, 57, 29, 19, 154, 98, 177, 87,
      231, 135, 134, 216, 192, 130, 242, 157, 207, 76, 17, 19,
      20, 0, 0, 0
    ])

    t.same(result, expected);

    t.end();
  });

  t.end();
})

tap.test('isIncludedParablockRecord util function', (t) => {
  const defaultPhaseIndex = 1;
  const defaultEventRecord = {
    phase: {
      isApplyExtrinsic: true,
      asApplyExtrinsic: {
        eq(index: number) {
          return index === defaultPhaseIndex;
        }
      }
    },
    event: {
      section: "paraInclusion",
      method: "CandidateIncluded",
    }
  } as unknown as EventRecord

  tap.test('isIncludedParablockRecord should return "true" if EventRecord matches phase index, section and method', (t) => {
    const result = isIncludedParablockRecord(defaultPhaseIndex)(defaultEventRecord);
    t.ok(result);
    t.end();
  });

  tap.test('isIncludedParablockRecord should return "false" if EventRecord does not match phase index, section or method', (t) => {
    const phaseIndex = 1;
    const eventRecordWithWrongIndex = {
      ...defaultEventRecord,
      phase: {
        asApplyExtrinsic: {
          eq(index: number) {
            return index === phaseIndex + 1;
          }
        }
      },
    } as unknown as EventRecord

    const eventRecordIsNotApplyExtrinsic = {
      ...defaultEventRecord,
      phase: {
        isApplyExtrinsic: false
      },
    } as unknown as EventRecord

    const eventRecordWrongSection = {
      ...defaultEventRecord,
      event: {
        section: "random section name"
      }
    } as unknown as EventRecord

    const eventRecordWrongMethod = {
      ...defaultEventRecord,
      event: {
        method: "random method name"
      }
    } as unknown as EventRecord

    const wrongIndex = isIncludedParablockRecord(phaseIndex)(eventRecordWithWrongIndex);
    t.notOk(wrongIndex);

    const notApplyExtrinsic = isIncludedParablockRecord(phaseIndex)(eventRecordIsNotApplyExtrinsic);
    t.notOk(notApplyExtrinsic);

    const wrongSection = isIncludedParablockRecord(phaseIndex)(eventRecordWrongSection);
    t.notOk(wrongSection);

    const wrongMethod = isIncludedParablockRecord(phaseIndex)(eventRecordWrongMethod);
    t.notOk(wrongMethod);

    t.end();
  });

  t.end();
})

tap.test('isInstanceOfSignedBlockJsonRpc util function', (t) => {
  tap.test('isInstanceOfSignedBlockJsonRpc should return "true" if object is an instance of SignedBlockJsonRpc', (t) => {
    const result = isInstanceOfSignedBlockJsonRpc(signedBlockMock);

    t.ok(result);
    t.end();
  });

  tap.test('isInstanceOfSignedBlockJsonRpc should return "false" if object is not an instance of SignedBlockJsonRpc', (t) => {
    const invalidObject = {
      ...signedBlockMock,
      block: {
        extrinsics: {}, // should be array
      },
    };

    const result = isInstanceOfSignedBlockJsonRpc(invalidObject);

    t.notOk(result);
    t.end();
  });

  t.end();
})
