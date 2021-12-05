export const bytesToSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const sizes = ["Bytes", "KiB", "MiB", "GiB", "TiB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  if (i === 0) return `${bytes} ${sizes[i]}`;
  return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
};

export const prettyHash = (
  hash: string,
  initSlice: number,
  lastsSlice: number
): string => {
  return `${hash.slice(0, initSlice)}...${hash.slice(
    hash.length - lastsSlice
  )}`;
};

export const explorerLink = (
  hashOrNumber: string | number,
  wss: string
): string => {
  return `https://polkadot.js.org/apps/?rpc=${wss}#/explorer/query/${hashOrNumber}`;
};

 