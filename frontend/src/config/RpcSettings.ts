import { assert } from "@polkadot/util";

export function getApiUrl(): string {
  const url = new URL(window.location.href);
  const rpc = url.searchParams.get("rpc");
  if (rpc) {
    assert(
      rpc.startsWith("ws://") || rpc.startsWith("wss://"),
      "Non-prefixed ws/wss url"
    );
    console.log("Using WS endpoint from query string:", rpc);
    return rpc;
  }
  const wsUrl = process.env.REACT_APP_WS_PROVIDER || "ws://localhost:9944";
  console.log("Using default WS endpoint:", wsUrl);
  return wsUrl;
}
