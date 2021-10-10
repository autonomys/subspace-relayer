export const bytesToSize = (bytes: number): string => {
  if(bytes === 0) return '0 B';
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = parseFloat(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
  if (i === 0) return `${bytes} ${sizes[i]}`;
  return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
};

export const prettyHash = (hash: string): string => {
  return `${hash.slice(0, 14)}...${hash.slice(hash.length - 6)}`;
};
