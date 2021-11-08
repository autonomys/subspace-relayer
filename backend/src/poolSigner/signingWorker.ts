import { parentPort, workerData } from "worker_threads";
import { blake2AsU8a, cryptoWaitReady } from "@polkadot/util-crypto";
import { KeyringPair, SignOptions } from "@polkadot/keyring/types";
import { Enum, TypeRegistry } from "@polkadot/types";

import { MessageSignature, MessageToSign } from "../poolSigner";
import { getAccount } from "../account";

const signOptions: SignOptions = {
    withType: (new TypeRegistry()).createType('ExtrinsicSignature') instanceof Enum,
};
let keyringPair: KeyringPair | undefined;

async function getKeypair(): Promise<KeyringPair> {
    if (keyringPair) {
        return keyringPair;
    }

    await cryptoWaitReady();
    keyringPair = getAccount(workerData.keypairSeed);

    return keyringPair;
}

function sign (keyringPair: KeyringPair, message: Uint8Array): Uint8Array {
    const encoded = message.length > 256
        ? blake2AsU8a(message)
        : message;

    return keyringPair.sign(encoded, signOptions);
}

if (parentPort) {
    // Just to make TS happy, it can't propagate above check into the closure below.
    const definitelyParentPort = parentPort;

    parentPort.on('message', async ({id, message}: MessageToSign) => {
        await cryptoWaitReady();
        const signature = sign(await getKeypair(), message);

        definitelyParentPort.postMessage(new MessageSignature(id, signature), [signature.buffer]);
    });
} else {
    console.error('signingWorker must only be used as a Worker Thread');
    process.exit(1);
}
