import queryString from "query-string";
import { assert } from "@polkadot/util";

export function getApiUrl(): string {
  const urlOptions = queryString.parse(window.location.href.split("?")[1]);
  if (urlOptions.rpc) {
    assert(!Array.isArray(urlOptions.rpc), "Invalid WS endpoint specified");
    const url = decodeURIComponent(urlOptions.rpc);
    assert(
      url.startsWith("ws://") || url.startsWith("wss://"),
      "Non-prefixed ws/wss url"
    );
    console.log("Using WS endpoint from query string:", url);
    return url;
  }
  const wsUrl = process.env.REACT_APP_WS_PROVIDER || "ws://localhost:9944";
  console.log("Using default WS endpoint:", wsUrl);
  return wsUrl;
}
