import { ApiPromise } from "@polkadot/api";
import { ApiOptions } from "@polkadot/api/types";
import { ProviderInterface } from "@polkadot/rpc-provider/types";
import { WsProvider } from "@polkadot/rpc-provider";
import { Text } from "@polkadot/types";
import { Totals } from "config/interfaces/Parachain";
import {
  BlockHash,
  ChainProperties,
  Header,
  Health,
} from "@polkadot/types/interfaces";

export interface ApiRxContextProviderProps {
  children?: React.ReactElement;
  provider: ProviderInterface;
}

export interface ApiPromiseContextProviderProps
  extends ApiRxContextProviderProps {
  types?: ApiOptions["types"];
}

export interface SystemContextProviderProps {
  children?: React.ReactElement;
  provider?: ProviderInterface;
}

export interface HealthContextProviderProps {
  children?: React.ReactElement;
  provider?: WsProvider;
}

export interface RelayerContextProviderProps {
  children?: React.ReactElement;
  provider?: ProviderInterface;
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

export interface RelayerContextType {
  feedsTotals: Array<Totals>;
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
