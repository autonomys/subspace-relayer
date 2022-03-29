import { TypeRegistry } from "@polkadot/types";
import { Registry } from "@polkadot/types/types";
import { Worker } from "worker_threads";
import { SignerPayloadJSON, SignerResult } from "@polkadot/types/types/extrinsic";

import { SignerWithAddress } from "./types";
import { getAccount } from "./account";

export class MessageToSign {
    public constructor(
        public readonly id: number,
        public readonly message: Uint8Array,
    ) {
    }
}

export class MessageSignature {
    public constructor(
        public readonly id: number,
        public readonly signature: Uint8Array,
    ) {
    }
}

class SigningWorker {
    private nextMessageId = 0;
    private readonly worker: Worker;
    private readonly map = new Map<number, (signature: `0x${string}`) => void>();

    public constructor(keypairSeed: string) {
        this.worker = new Worker(__dirname + '/poolSigner/signingWorker', {
            workerData: {
                keypairSeed,
            },
        });
        this.worker.on('message', ({id, signature}: MessageSignature) => {
            const callback = this.map.get(id);
            if (callback) {
                this.map.delete(id);
                callback(`0x${Buffer.from(signature).toString('hex')}`);
            }
        });
        this.worker.unref();
    }

    public sign(message: Uint8Array): Promise<`0x${string}`> {
        return new Promise<`0x${string}`>((resolve) => {
            const id = this.nextMessageId;
            this.nextMessageId++;
            this.map.set(id, resolve);

            this.worker.postMessage(new MessageToSign(id, message), [message.buffer]);
        });
    }
}

export class PoolSigner extends SignerWithAddress {
    private id = 0;
    private nextWorker = 0;
    private readonly workers: SigningWorker[] = [];

    public constructor(
        private readonly registry: TypeRegistry | Registry,
        keypairSeed: string,
        poolSize: number,
    ) {
        super(getAccount(keypairSeed).address)

        for (let i = 0; i < poolSize; i++) {
            this.workers.push(new SigningWorker(keypairSeed));
        }
    }

    public async signPayload(payload: SignerPayloadJSON): Promise<SignerResult> {
        const worker = this.workers[this.nextWorker];
        this.nextWorker++;
        if (this.nextWorker === this.workers.length) {
            this.nextWorker = 0;
        }

        const message = this.registry
            .createType('ExtrinsicPayload', payload, { version: payload.version })
            // NOTE Explicitly pass the bare flag so the method is encoded un-prefixed (non-decodable, for signing only)
            .toU8a({ method: true });

        const signature = await worker.sign(message);

        this.id++;

        return {
            id: this.id,
            signature,
        };
    }
}
