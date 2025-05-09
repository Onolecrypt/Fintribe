// Ethereum provider interface
interface EthereumProvider {
  isMetaMask?: boolean;
  selectedAddress?: string;
  chainId?: string;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (eventName: string, handler: (...args: any[]) => void) => void;
  removeAllListeners: (eventName: string) => void;
}

interface Window {
  ethereum?: EthereumProvider;
}