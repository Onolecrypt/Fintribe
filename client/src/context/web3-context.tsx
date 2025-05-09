import React, { createContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  getProvider,
  getSigner,
  getAddress,
  getNetwork,
  getGasPrice,
  listenToAccountChanges,
  listenToNetworkChanges,
  removeListeners,
  switchNetwork as switchNetworkUtils,
  type Provider,
  type Signer
} from '@/lib/web3';

interface Web3ContextType {
  provider: Provider;
  signer: Signer;
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  networkId: number | null;
  networkName: string | null;
  gasPrice: string | null;
  connectWallet: () => Promise<boolean | void>;
  disconnectWallet: () => void;
  switchNetwork: (chainId: string) => Promise<void>;
}

// Create a default context value to avoid the "must be used within a provider" error
const defaultContextValue: Web3ContextType = {
  provider: null,
  signer: null,
  address: null,
  isConnected: false,
  isConnecting: false,
  networkId: null,
  networkName: null,
  gasPrice: null,
  connectWallet: async () => { 
    console.log("Default connectWallet called"); 
    return false;
  },
  disconnectWallet: () => { 
    console.log("Default disconnectWallet called"); 
  },
  switchNetwork: async () => { 
    console.log("Default switchNetwork called"); 
  }
};

export const Web3Context = createContext<Web3ContextType>(defaultContextValue);

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [provider, setProvider] = useState<Provider>(null);
  const [signer, setSigner] = useState<Signer>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [networkId, setNetworkId] = useState<number | null>(null);
  const [networkName, setNetworkName] = useState<string | null>(null);
  const [gasPrice, setGasPrice] = useState<string | null>(null);

  const updateProviderState = useCallback(async (newProvider: Provider) => {
    if (!newProvider) {
      setProvider(null);
      setSigner(null);
      setAddress(null);
      setIsConnected(false);
      setNetworkId(null);
      setNetworkName(null);
      setGasPrice(null);
      return;
    }

    try {
      // getSigner is now async
      const newSigner = await getSigner(newProvider);
      // Use explicit casting to solve TypeScript issues
      setSigner(newSigner as unknown as Signer);
      
      if (newSigner) {
        const newAddress = await getAddress(newSigner);
        setAddress(newAddress);
        setIsConnected(!!newAddress);
      } else {
        setAddress(null);
        setIsConnected(false);
      }

      const network = await getNetwork(newProvider);
      if (network) {
        setNetworkId(network.chainId);
        setNetworkName(network.name);
      }

      const price = await getGasPrice(newProvider);
      setGasPrice(price);
    } catch (error) {
      console.error("Error updating provider state:", error);
    }
  }, []);

  // Connect wallet function
  const connectWallet = useCallback(async () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    try {
      // Try to get a web3 provider (either metamask or fallback)
      const newProvider = await getProvider();
      
      // Check if this is a fallback provider or a real wallet connection
      const isFallback = newProvider ? !('getSigner' in newProvider) : true;
      
      setProvider(newProvider);
      await updateProviderState(newProvider);
      
      if (isFallback) {
        console.log("Using fallback provider for demonstration");
        return false; // Indicate we're using a fallback
      } else {
        console.log("Successfully connected to wallet");
        return true; // Successful connection to a real wallet
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      // Important: Don't throw the error, just handle it
      // Setting a fallback provider for demo purposes
      try {
        const fallbackProvider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/demo');
        setProvider(fallbackProvider);
        await updateProviderState(fallbackProvider);
        return false;
      } catch (fallbackError) {
        console.error("Failed to set up fallback provider:", fallbackError);
        throw error; // Re-throw the original error if fallback fails
      }
    } finally {
      setIsConnecting(false);
    }
  }, [updateProviderState, isConnecting]);

  // Disconnect wallet function
  const disconnectWallet = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setIsConnected(false);
    setNetworkId(null);
    setNetworkName(null);
    setGasPrice(null);
    
    // Clear any stored connection state if needed
    // localStorage.removeItem('walletConnected');
  }, []);

  // Switch network function
  const switchNetwork = useCallback(async (chainId: string) => {
    if (!provider) {
      throw new Error("Provider not initialized. Connect wallet first.");
    }
    
    try {
      const success = await switchNetworkUtils(provider, chainId);
      if (!success) {
        throw new Error("Failed to switch network");
      }
    } catch (error) {
      console.error("Error switching network:", error);
      throw error;
    }
  }, [provider]);

  // Set up listeners for account and network changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setIsConnected(true);
        } else {
          setAddress(null);
          setIsConnected(false);
        }
      };

      const handleChainChanged = () => {
        // Reload the page when the chain changes as recommended by MetaMask
        window.location.reload();
      };

      listenToAccountChanges(handleAccountsChanged);
      listenToNetworkChanges(handleChainChanged);

      // Check if we should auto-connect
      const checkPreviousConnection = async () => {
        try {
          // Check if ethereum is defined and has selectedAddress
          if (window.ethereum && typeof window.ethereum.selectedAddress === 'string') {
            await connectWallet();
          }
        } catch (error) {
          console.error("Auto-connect failed:", error);
        }
      };
      
      checkPreviousConnection();

      return () => {
        removeListeners();
      };
    }
  }, [connectWallet]);

  // Update gas price periodically
  useEffect(() => {
    if (!provider) return;

    const updateGas = async () => {
      try {
        const price = await getGasPrice(provider);
        setGasPrice(price);
      } catch (error) {
        console.error("Error updating gas price:", error);
      }
    };

    const gasPriceInterval = setInterval(updateGas, 30000); // Update every 30 seconds

    return () => {
      clearInterval(gasPriceInterval);
    };
  }, [provider]);

  const value = {
    provider,
    signer,
    address,
    isConnected,
    isConnecting,
    networkId,
    networkName,
    gasPrice,
    connectWallet,
    disconnectWallet,
    switchNetwork
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};
