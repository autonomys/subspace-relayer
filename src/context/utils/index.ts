import { ProviderInterface } from "@polkadot/rpc-provider/types";
import { Observable } from "rxjs";

export function providerConnected(
  provider: ProviderInterface
): Observable<boolean> {
  return new Observable((subscriber) => {
    if (provider.isConnected) {
      subscriber.next(true);
    } else {
      subscriber.next(false);
    }

    provider.on("connected", () => {
      subscriber.next(true);
    });

    provider.on("disconnected", () => {
      subscriber.next(false);
    });
  });
}
