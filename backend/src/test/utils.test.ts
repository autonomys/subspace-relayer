import * as tap from 'tap';
import '@polkadot/api-augment';
import { Event, EventRecord } from "@polkadot/types/interfaces/system";

import {
  getParaHeadAndIdFromEvent,
  isIncludedParablockRecord,
  isInstanceOfSignedBlockJsonRpc,
  blockToBinary,
} from '../utils';
import * as signedBlockMock from '../mocks/signedBlock.json';
import * as signedBlockWithExtrinsicsMock from '../mocks/signedBlockWithExtrinsics.json';
import * as signedBlockWithLogsMock from '../mocks/signedBlockWithLogs.json';

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

tap.test('blockToBinary util function', (t) => {
  tap.test('blockToBinary should convert SignedBlockJsonRpc to Buffer', (t) => {
    const result = blockToBinary(signedBlockMock);

    const hex = '000000000000000000000000000000000000000000000000000000000000000000299ac939ea4722d1fcf7f4873675040ebc83d144620c76206dbeb7468cf30cdf03170a2e7597b7b7e3d84c05391d139a62b157e78786d8c082f29dcf4c111314000000';

    const expected = Buffer.from(hex, 'hex');

    t.same(result, expected);

    t.end();
  });

  tap.test('blockToBinary should convert SignedBlockJsonRpc with extrinsics to Buffer', (t) => {
    const result = blockToBinary(signedBlockWithExtrinsicsMock);

    const hex = 'cf5fa8ef2fe76c0d6288535231d21989829933b986d32a3ba452173c5a2074f129343fe7723fdb1a60938e45b72f1d84f414434b9df4ece367dbb39912ebe1a85e9fe52df22c1a9deb8ed460e5d80a3dd8e1090bfd51631f53eca465915089703b92080661757261208e0849170000000005617572610101039584bca9a9dd88d4bede8787ce022ddea809cef8ebdbf0d7b17c918e49921c86e6d6aedebc991630f7634b3f3306b6c134e87325f34301de5745df0da0240e04250281ff90b5ab205c6974c9ea841be688864633dc9ca8a357843eeacf2314649965fe2290b20be8c5929d7d4dfe3f8124bad55217fa0dc53210399448a7bddefade7a7e64489c1acbfe65eb42d235e6d54279cd88e4d6d6147862a4e5c6ba2ed44594006c000600ffe659a7a1628cdd93febc04a4e0646ea20e9f5f0ce097d9a05290d4a9e054df4ee5c000';

    const expected = Buffer.from(hex, 'hex');

    t.same(result, expected);

    t.end()
  });

  tap.test('blockToBinary should convert SignedBlockJsonRpc with digest logs to Buffer', (t) => {
    const result = blockToBinary(signedBlockWithLogsMock);

    const hex = 'f17a9ca2e515a68c6e1b0315c5182d237580507c60487f5a6b75c703aa3e84ab79025a4cfd95c29f8db93119a11e012c3905767cc4b7e3a3a2f6bc72879e51a47cd4907510396823ad5299bd8b7e3d922e182f117032a0653a85f9ad3cb58044a08608066175726120614c41170000000005617572610101c4dd7f7d2a7521a91b821c44d0b8a628e4d804c0428b20a8e281aeaff575001cd55f4540db0fa78e5521b330d1a7ef9e8b922ca723097b4ab83e59a13fb44f0c0000';

    const expected = Buffer.from(hex, 'hex');

    t.same(result, expected);

    t.end();
  });

  tap.test('blockToBinary should convert SignedBlockJsonRpc with justifications to Buffer');

  t.end();
});
