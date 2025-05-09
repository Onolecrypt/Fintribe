import { useContext } from 'react';
import { Web3Context } from '@/context/web3-context';

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  
  if (!context) {
    // This should never happen because we've defined a default context value
    console.error('useWeb3 must be used within a Web3Provider');
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  
  return context;
};
