import { ethers } from "ethers";

export type Provider = ethers.BrowserProvider | ethers.JsonRpcProvider | null;
export type Signer = ethers.Signer | null;

export const NETWORKS = {
  1: "Ethereum Mainnet",
  5: "Goerli Testnet",
  11155111: "Sepolia Testnet",
  // Add more networks as needed
};

// Create a fallback provider for development environment
const createFallbackProvider = () => {
  console.log("Using fallback provider for development environment");
  // Use a public Ethereum node for testing purposes
  const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/demo');
  return provider;
};

// Get Ethereum provider from window.ethereum or use fallback for development
export const getProvider = async (): Promise<Provider> => {
  // Check if we're in a browser environment and if MetaMask is available
  const hasEthereum = typeof window !== 'undefined' && 
                      typeof window.ethereum !== 'undefined';
  
  if (!hasEthereum) {
    console.warn("No Ethereum wallet detected. Using fallback provider for development.");
    return createFallbackProvider();
  }
  
  // Normal flow for browsers with Ethereum wallet
  try {
    // Request account access
    const accounts = await window.ethereum?.request({ method: "eth_requestAccounts" });
    
    // Check if user actually connected (has accounts)
    if (!accounts || accounts.length === 0) {
      console.warn("User rejected connection. Using fallback provider.");
      return createFallbackProvider();
    }
    
    // Create provider instance if ethereum is available
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      return provider;
    } else {
      return createFallbackProvider();
    }
  } catch (error) {
    console.error("Error connecting to wallet:", error);
    
    // Always return a fallback provider so the app can still function
    console.warn("Falling back to development provider");
    return createFallbackProvider();
  }
};

// Get signer from provider
export const getSigner = async (provider: Provider): Promise<Signer> => {
  if (!provider) return null;
  
  try {
    // BrowserProvider has getSigner() method but it returns a Promise<JsonRpcSigner>
    if (provider instanceof ethers.BrowserProvider) {
      // This will return a Signer - using any for now due to type issues
      return await provider.getSigner() as any;
    } else {
      // For JsonRpcProvider, create a dummy wallet for development purposes
      const privateKey = '0x0123456789012345678901234567890123456789012345678901234567890123';
      return new ethers.Wallet(privateKey, provider);
    }
  } catch (error) {
    console.error("Error getting signer:", error);
    return null;
  }
};

// Get connected account address
export const getAddress = async (signer: Signer): Promise<string | null> => {
  if (!signer) return null;
  try {
    return await signer.getAddress();
  } catch (error) {
    console.error("Error getting address", error);
    return null;
  }
};

// Get current network
export const getNetwork = async (provider: Provider): Promise<{ chainId: number; name: string } | null> => {
  if (!provider) return null;
  try {
    const network = await provider.getNetwork();
    const chainIdNumber = Number(network.chainId);
    const networkName = NETWORKS[chainIdNumber as keyof typeof NETWORKS] || "Unknown Network";
    return {
      chainId: chainIdNumber,
      name: networkName,
    };
  } catch (error) {
    console.error("Error getting network", error);
    return null;
  }
};

// Switch network
export const switchNetwork = async (provider: Provider, chainId: string): Promise<boolean> => {
  if (!provider) return false;
  
  // For development environment without window.ethereum
  if (typeof window === 'undefined' || !window.ethereum) {
    console.warn("Cannot switch network in development environment without a wallet. Simulating success.");
    return true;
  }
  
  try {
    await window.ethereum?.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ethers.toBeHex(Number(chainId)) }],
    });
    return true;
  } catch (error: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (error.code === 4902) {
      try {
        // Add network configuration based on chainId
        const networkDetails = getNetworkDetails(chainId);
        if (networkDetails && window.ethereum) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [networkDetails],
          });
          return true;
        }
      } catch (addError) {
        console.error("Error adding network", addError);
      }
    }
    console.error("Error switching network", error);
    return false;
  }
};

// Helper to get network details for adding to wallet
const getNetworkDetails = (chainId: string) => {
  const id = Number(chainId);
  switch (id) {
    case 1:
      return {
        chainId: ethers.toBeHex(1),
        chainName: "Ethereum Mainnet",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: ["https://mainnet.infura.io/v3/"],
        blockExplorerUrls: ["https://etherscan.io"],
      };
    case 5:
      return {
        chainId: ethers.toBeHex(5),
        chainName: "Goerli Testnet",
        nativeCurrency: { name: "Goerli Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: ["https://goerli.infura.io/v3/"],
        blockExplorerUrls: ["https://goerli.etherscan.io"],
      };
    case 11155111:
      return {
        chainId: ethers.toBeHex(11155111),
        chainName: "Sepolia Testnet",
        nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: ["https://sepolia.infura.io/v3/"],
        blockExplorerUrls: ["https://sepolia.etherscan.io"],
      };
    default:
      return null;
  }
};

// Get gas price
export const getGasPrice = async (provider: Provider): Promise<string | null> => {
  if (!provider) return null;
  try {
    const feeData = await provider.getFeeData();
    if (feeData.gasPrice) {
      return ethers.formatUnits(feeData.gasPrice, "gwei").slice(0, 5);
    }
    return "0";
  } catch (error) {
    console.error("Error getting gas price", error);
    return null;
  }
};

// Check if provider is connected
export const isProviderConnected = async (provider: Provider): Promise<boolean> => {
  if (!provider) return false;
  try {
    const accounts = await provider.listAccounts();
    return accounts.length > 0;
  } catch (error) {
    console.error("Error checking connection", error);
    return false;
  }
};

// Listen for account changes
export const listenToAccountChanges = (callback: (accounts: string[]) => void): void => {
  if (window.ethereum) {
    window.ethereum.on("accountsChanged", callback);
  }
};

// Listen for network changes
export const listenToNetworkChanges = (callback: (chainId: string) => void): void => {
  if (window.ethereum) {
    window.ethereum.on("chainChanged", callback);
  }
};

// Remove listeners
export const removeListeners = (): void => {
  if (window.ethereum) {
    window.ethereum.removeAllListeners("accountsChanged");
    window.ethereum.removeAllListeners("chainChanged");
  }
};
