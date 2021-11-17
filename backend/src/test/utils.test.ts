import * as tap from 'tap';
import { Event, EventRecord } from "@polkadot/types/interfaces/system";

import { getParaHeadAndIdFromEvent, isIncludedParablockRecord } from '../utils';

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

  tap.test('hexToUint8Array should accept hex string and return Uint8Array');

  tap.test('blockToBinary should convert SignedBlockJsonRpc to Buffer');

  tap.test('isInstanceOfSignedBlockJsonRpc should return "true" if object is an instance of SignedBlockJsonRpc');

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
