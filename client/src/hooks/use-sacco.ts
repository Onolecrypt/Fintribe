import { useContext } from 'react';
import { SaccoContext } from '@/context/sacco-context';

export const useSacco = () => {
  const context = useContext(SaccoContext);
  
  if (context === undefined) {
    throw new Error('useSacco must be used within a SaccoProvider');
  }
  
  return context;
};
