import { ApiPromise } from "@polkadot/api";
import { ApiOptions } from "@polkadot/api/types";
import { WsProvider } from "@polkadot/rpc-provider";
import { Text } from "@polkadot/types";
import {
  BlockHash,
  ChainProperties,
  Header,
  Health,
} from "@polkadot/types/interfaces";

export interface ProviderContextType {
  provider: WsProvider;
}

export interface ProviderContextProps {
  provider: WsProvider;
  children?: React.ReactElement;
}

export interface ApiRxContextProviderProps {
  children?: React.ReactElement;
}

export interface ApiPromiseContextProviderProps
  extends ApiRxContextProviderProps {
  types?: ApiOptions["types"];
}

export interface SystemContextProviderProps {
  children?: React.ReactElement;
}

export interface HealthContextProviderProps {
  children?: React.ReactElement;
}

export interface ApiPromiseContextType {
  api: ApiPromise;
  isApiReady: boolean;
}

export interface HealthContextType {
  best: number;
  hasPeers: boolean;
  isNodeConnected: boolean;
  isSyncing: boolean;
}

export interface SystemContextType {
  chain?: Text;
  genesisHash?: BlockHash;
  header?: Header;
  health?: Health;
  isSystemReady: boolean;
  name?: Text;
  properties?: ChainProperties;
  version?: Text;
}
