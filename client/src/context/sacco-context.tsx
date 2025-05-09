import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '@/hooks/use-web3';
import { SaccoContract } from '@/lib/sacco-contract';
import { apiRequest } from '@/lib/queryClient';
import { ethers } from 'ethers';

// Define contract address for the SaccoDAO contract
// In a production environment, this would ideally come from environment variables
const CONTRACT_ADDRESS = import.meta.env.VITE_SACCO_CONTRACT_ADDRESS || "0x8B45D192282F7Ad6EE89610dBe6ABf9EDC7B7D33";

interface SaccoContextType {
  contractAddress: string;
  saccoContract: SaccoContract | null;
  gasPrice: string | null;
  interestRate: number;
  loanMultiplierLimit: number;
  isLoading: boolean;
  error: string | null;
  
  // User and group-related functions
  getUserInfo: (address: string) => Promise<any>;
  getUserGroup: (address: string) => Promise<any>;
  getUserBalance: () => Promise<number>;
  getGroupInfo: (address: string) => Promise<any>;
  getGroupMembers: (groupId: number) => Promise<any[]>;
  getAllGroups: () => Promise<any[]>;
  
  // Financial operations
  deposit: (amount: number) => Promise<void>;
  calculateUserInterest: (address: string) => Promise<number>;
  withdrawInterest: () => Promise<void>;
  
  // Loan operations
  requestLoan: (amount: number, durationDays: number, guarantors: string[]) => Promise<void>;
  getUserLoans: (address: string) => Promise<any[]>;
  getActiveLoans: (address: string) => Promise<any[]>;
  repayLoan: (loanId: number) => Promise<void>;
  
  // Guarantor operations
  getGuarantorRequests: (address: string, approved: boolean) => Promise<any[]>;
  getGuarantorHistory: (address: string) => Promise<any[]>;
  approveGuarantorRequest: (loanId: number, approve: boolean) => Promise<void>;
  
  // Proposal operations
  getGroupProposals: (groupId: number) => Promise<any[]>;
  createProposal: (groupId: number, description: string, deadline: Date) => Promise<void>;
  voteOnProposal: (proposalId: number, voteValue: boolean) => Promise<void>;
  executeProposal: (proposalId: number) => Promise<void>;
  checkIfUserHasVoted: (proposalId: number) => Promise<boolean>;
  
  // Group activity
  getGroupActivities: (groupId: number, limit?: number) => Promise<any[]>;
}

export const SaccoContext = createContext<SaccoContextType | undefined>(undefined);

export const SaccoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { provider, signer, address, isConnected } = useWeb3();
  const [saccoContract, setSaccoContract] = useState<SaccoContract | null>(null);
  const [interestRate, setInterestRate] = useState<number>(3); // Default value from contract
  const [loanMultiplierLimit, setLoanMultiplierLimit] = useState<number>(3); // Default value from contract
  const [gasPrice, setGasPrice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the contract when provider and signer are available
  useEffect(() => {
    if (provider && signer && isConnected) {
      const contract = new SaccoContract(provider, signer, CONTRACT_ADDRESS);
      setSaccoContract(contract);
      
      // Load contract constants
      const loadContractInfo = async () => {
        try {
          const rate = await contract.getInterestRate();
          setInterestRate(rate);
          
          const limit = await contract.getLoanMultiplierLimit();
          setLoanMultiplierLimit(limit);
        } catch (error) {
          console.error("Error loading contract info:", error);
          setError("Failed to load contract information");
        }
      };
      
      loadContractInfo();
    } else {
      setSaccoContract(null);
    }
  }, [provider, signer, isConnected]);

  // User and Group Functions
  const getUserInfo = useCallback(async (userAddress: string) => {
    try {
      // First try to get from backend
      const response = await apiRequest("GET", `/api/users/${userAddress}`);
      return await response.json();
    } catch (error) {
      // If backend fails, try to get directly from blockchain
      if (saccoContract) {
        try {
          setIsLoading(true);
          
          // Get member info from blockchain
          const memberInfo = await saccoContract.getMember(userAddress);
          
          // Create user in backend if doesn't exist
          try {
            await apiRequest("POST", "/api/users", {
              address: userAddress,
              groupId: memberInfo.groupId > 0 ? memberInfo.groupId : null,
              totalDeposits: memberInfo.totalDeposits,
              creditScore: memberInfo.creditScore,
              lastDepositTime: memberInfo.lastDepositTime.toISOString(),
              registered: memberInfo.registered,
              isDefaulted: memberInfo.isDefaulted
            });
          } catch (apiError) {
            console.error("Error creating user in backend:", apiError);
          }
          
          return memberInfo;
        } catch (contractError) {
          console.error("Error getting user from contract:", contractError);
          throw new Error("Failed to get user information");
        } finally {
          setIsLoading(false);
        }
      } else {
        throw new Error("Contract not initialized");
      }
    }
  }, [saccoContract]);

  const getUserBalance = useCallback(async () => {
    if (!saccoContract || !address) {
      throw new Error("Contract not initialized or user not connected");
    }
    
    try {
      setIsLoading(true);
      const balance = await saccoContract.getStablecoinBalance(address);
      return balance;
    } catch (error) {
      console.error("Error getting balance:", error);
      throw new Error("Failed to get token balance");
    } finally {
      setIsLoading(false);
    }
  }, [saccoContract, address]);

  const getUserGroup = useCallback(async (userAddress: string) => {
    try {
      const response = await apiRequest("GET", `/api/users/${userAddress}/group`);
      return await response.json();
    } catch (error) {
      console.error("Error getting user group:", error);
      throw new Error("Failed to get user group");
    }
  }, []);

  const getGroupInfo = useCallback(async (userAddress: string) => {
    try {
      // First get the user's group ID
      const user = await getUserInfo(userAddress);
      
      if (!user || !user.groupId) {
        return null;
      }
      
      // Then get the group info
      const response = await apiRequest("GET", `/api/groups/${user.groupId}`);
      return await response.json();
    } catch (error) {
      console.error("Error getting group info:", error);
      throw new Error("Failed to get group information");
    }
  }, [getUserInfo]);

  const getGroupMembers = useCallback(async (groupId: number) => {
    if (groupId <= 0) return [];
    
    try {
      const response = await apiRequest("GET", `/api/groups/${groupId}/members`);
      return await response.json();
    } catch (error) {
      console.error("Error getting group members:", error);
      throw new Error("Failed to get group members");
    }
  }, []);

  const getAllGroups = useCallback(async () => {
    try {
      const response = await apiRequest("GET", `/api/groups`);
      return await response.json();
    } catch (error) {
      console.error("Error getting all groups:", error);
      throw new Error("Failed to get groups");
    }
  }, []);

  // Financial Operations
  const deposit = useCallback(async (amount: number) => {
    if (!saccoContract) {
      throw new Error("Contract not initialized");
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // First ensure allowance is sufficient 
      const allowance = await saccoContract.checkAllowance(address || "");
      
      if (allowance < amount) {
        // Approve tokens first
        const approveTx = await saccoContract.approveStablecoin(amount * 2); // Approve more to avoid frequent approvals
        // In ethers v6, we need to use .wait() differently
        const receipt = await approveTx.wait();
        if (!receipt) throw new Error("Transaction failed");
      }
      
      // Execute deposit
      const tx = await saccoContract.deposit(amount);
      // In ethers v6, we need to use .wait() differently
      const receipt = await tx.wait();
      if (!receipt) throw new Error("Transaction failed");
      
      // Sync with backend
      try {
        if (address) {
          const userInfo = await saccoContract.getMember(address);
          await apiRequest("PATCH", `/api/users/${address}`, {
            totalDeposits: userInfo.totalDeposits,
            lastDepositTime: userInfo.lastDepositTime.toISOString()
          });
          
          // Add activity record
          if (userInfo.groupId > 0) {
            await apiRequest("POST", `/api/groups/${userInfo.groupId}/activities`, {
              userAddress: address,
              activityType: "deposit",
              description: `${address} deposited ${amount} USDC`
            });
          }
        }
      } catch (apiError) {
        console.error("Error syncing deposit with backend:", apiError);
      }
    } catch (error) {
      console.error("Error depositing funds:", error);
      setError(error instanceof Error ? error.message : "Failed to deposit funds");
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [saccoContract, address]);

  const calculateUserInterest = useCallback(async (userAddress: string) => {
    if (!saccoContract) {
      return 0;
    }
    
    try {
      setIsLoading(true);
      const interest = await saccoContract.calculateInterest(userAddress);
      return interest;
    } catch (error) {
      console.error("Error calculating interest:", error);
      return 0;
    } finally {
      setIsLoading(false);
    }
  }, [saccoContract]);

  const withdrawInterest = useCallback(async () => {
    if (!saccoContract) {
      throw new Error("Contract not initialized");
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const tx = await saccoContract.withdrawInterest();
      // In ethers v6, we need to use .wait() differently
      const receipt = await tx.wait();
      if (!receipt) throw new Error("Transaction failed");
      
      // Sync with backend
      try {
        if (address) {
          const userInfo = await saccoContract.getMember(address);
          await apiRequest("PATCH", `/api/users/${address}`, {
            lastDepositTime: userInfo.lastDepositTime.toISOString()
          });
          
          // Add activity record
          if (userInfo.groupId > 0) {
            const interest = await saccoContract.calculateInterest(address);
            await apiRequest("POST", `/api/groups/${userInfo.groupId}/activities`, {
              userAddress: address,
              activityType: "withdrawal",
              description: `${address} withdrew ${interest} USDC in interest`
            });
          }
        }
      } catch (apiError) {
        console.error("Error syncing interest withdrawal with backend:", apiError);
      }
    } catch (error) {
      console.error("Error withdrawing interest:", error);
      setError(error instanceof Error ? error.message : "Failed to withdraw interest");
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [saccoContract, address]);

  // Loan Operations
  const requestLoan = useCallback(async (amount: number, durationDays: number, guarantors: string[]) => {
    if (!saccoContract) {
      throw new Error("Contract not initialized");
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Submit loan request to blockchain
      const tx = await saccoContract.requestLoan(amount, durationDays, guarantors);
      // In ethers v6, we need to use .wait() differently
      const receipt = await tx.wait();
      if (!receipt) throw new Error("Transaction failed");
      
      // Sync with backend
      try {
        if (address) {
          // Create loan record in backend
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + durationDays);
          
          const response = await apiRequest("POST", "/api/loans", {
            borrowerAddress: address,
            amount: amount,
            dueDate: dueDate.toISOString(),
            repaid: false,
            approved: false,
            defaulted: false,
            guarantors: guarantors
          });
          
          // Get user info to find group
          const userInfo = await getUserInfo(address);
          
          if (userInfo && userInfo.groupId) {
            // Add activity record
            await apiRequest("POST", `/api/groups/${userInfo.groupId}/activities`, {
              userAddress: address,
              activityType: "loan_request",
              description: `${address} requested a loan of ${amount} USDC`
            });
          }
        }
      } catch (apiError) {
        console.error("Error syncing loan request with backend:", apiError);
      }
    } catch (error) {
      console.error("Error requesting loan:", error);
      setError(error instanceof Error ? error.message : "Failed to request loan");
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [saccoContract, address, getUserInfo]);

  const getUserLoans = useCallback(async (userAddress: string) => {
    try {
      const response = await apiRequest("GET", `/api/users/${userAddress}/loans`);
      return await response.json();
    } catch (error) {
      console.error("Error getting user loans:", error);
      throw new Error("Failed to get user loans");
    }
  }, []);

  const getActiveLoans = useCallback(async (userAddress: string) => {
    try {
      const loans = await getUserLoans(userAddress);
      return loans.filter((loan: any) => loan.approved && !loan.repaid && !loan.defaulted);
    } catch (error) {
      console.error("Error getting active loans:", error);
      throw new Error("Failed to get active loans");
    }
  }, [getUserLoans]);

  const repayLoan = useCallback(async (loanId: number) => {
    if (!saccoContract || !address) {
      throw new Error("Contract not initialized or user not connected");
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Get the loan from backend to ensure it exists
      const loanResponse = await apiRequest("GET", `/api/loans/${loanId}`);
      const loan = await loanResponse.json();
      
      if (loan.borrowerAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error("Only the borrower can repay this loan");
      }
      
      // Find the index of this loan for the borrower
      const userLoans = await getUserLoans(address);
      const loanIndex = userLoans.findIndex((l: any) => l.id === loanId);
      
      if (loanIndex === -1) {
        throw new Error("Loan not found for this user");
      }
      
      // Repay loan on blockchain
      const tx = await saccoContract.repayLoan(loanIndex);
      // In ethers v6, we need to use .wait() differently
      const receipt = await tx.wait();
      if (!receipt) throw new Error("Transaction failed");
      
      // Update loan status in backend
      await apiRequest("PATCH", `/api/loans/${loanId}`, {
        repaid: true
      });
      
      // Add activity record
      if (loan.borrowerAddress) {
        const userInfo = await getUserInfo(loan.borrowerAddress);
        if (userInfo && userInfo.groupId) {
          await apiRequest("POST", `/api/groups/${userInfo.groupId}/activities`, {
            userAddress: loan.borrowerAddress,
            activityType: "loan_repaid",
            description: `${loan.borrowerAddress} repaid loan of ${loan.amount} USDC`
          });
        }
      }
    } catch (error) {
      console.error("Error repaying loan:", error);
      setError(error instanceof Error ? error.message : "Failed to repay loan");
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [saccoContract, address, getUserLoans, getUserInfo]);

  // Guarantor Operations
  const getGuarantorRequests = useCallback(async (guarantorAddress: string, approved: boolean) => {
    try {
      // Get all loans 
      const response = await apiRequest("GET", "/api/loans");
      const allLoans = await response.json();
      
      // Filter loans where this address is a guarantor and matches the approved status
      return allLoans.filter((loan: any) => {
        return loan.guarantors && 
               loan.guarantors.some((g: any) => 
                 g.guarantorAddress.toLowerCase() === guarantorAddress.toLowerCase() && 
                 g.approved === approved
               ) &&
               !loan.repaid && 
               !loan.defaulted;
      });
    } catch (error) {
      console.error("Error getting guarantor requests:", error);
      throw new Error("Failed to get guarantor requests");
    }
  }, []);

  const getGuarantorHistory = useCallback(async (guarantorAddress: string) => {
    try {
      // Get all loans
      const response = await apiRequest("GET", "/api/loans");
      const allLoans = await response.json();
      
      // Filter loans where this address is a guarantor
      return allLoans.filter((loan: any) => {
        return loan.guarantors && 
               loan.guarantors.some((g: any) => 
                 g.guarantorAddress.toLowerCase() === guarantorAddress.toLowerCase()
               );
      });
    } catch (error) {
      console.error("Error getting guarantor history:", error);
      throw new Error("Failed to get guarantor history");
    }
  }, []);

  const approveGuarantorRequest = useCallback(async (loanId: number, approve: boolean) => {
    if (!saccoContract || !address) {
      throw new Error("Contract not initialized or user not connected");
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Get the loan from backend
      const loanResponse = await apiRequest("GET", `/api/loans/${loanId}`);
      const loan = await loanResponse.json();
      
      // Check if user is a guarantor for this loan
      const isGuarantor = loan.guarantors && loan.guarantors.some(
        (g: any) => g.guarantorAddress.toLowerCase() === address.toLowerCase()
      );
      
      if (!isGuarantor) {
        throw new Error("You are not a guarantor for this loan");
      }
      
      // Find the index of this loan for the borrower
      const borrowerLoans = await getUserLoans(loan.borrowerAddress);
      const loanIndex = borrowerLoans.findIndex((l: any) => l.id === loanId);
      
      if (loanIndex === -1) {
        throw new Error("Loan not found");
      }
      
      if (approve) {
        // Approve as guarantor on blockchain
        const tx = await saccoContract.approveAsGuarantor(loan.borrowerAddress, loanIndex);
        // In ethers v6, we need to use .wait() differently
        const receipt = await tx.wait();
        if (!receipt) throw new Error("Transaction failed");
      }
      
      // Update guarantor status in backend
      await apiRequest("PATCH", `/api/loans/${loanId}/guarantors/${address}`, {
        approved: approve
      });
      
      // Add activity record
      const userInfo = await getUserInfo(loan.borrowerAddress);
      if (userInfo && userInfo.groupId) {
        await apiRequest("POST", `/api/groups/${userInfo.groupId}/activities`, {
          userAddress: address,
          activityType: approve ? "guarantor_approved" : "guarantor_declined",
          description: `${address} ${approve ? "approved" : "declined"} to be a guarantor for ${loan.borrowerAddress}'s loan`
        });
      }
    } catch (error) {
      console.error("Error approving guarantor request:", error);
      setError(error instanceof Error ? error.message : "Failed to process guarantor request");
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [saccoContract, address, getUserLoans, getUserInfo]);

  // Proposal Operations
  const getGroupProposals = useCallback(async (groupId: number) => {
    if (groupId <= 0) return [];
    
    try {
      const response = await apiRequest("GET", `/api/groups/${groupId}/proposals`);
      return await response.json();
    } catch (error) {
      console.error("Error getting group proposals:", error);
      throw new Error("Failed to get group proposals");
    }
  }, []);

  const createProposal = useCallback(async (groupId: number, description: string, deadline: Date) => {
    if (!saccoContract || !address) {
      throw new Error("Contract not initialized or user not connected");
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Create proposal on blockchain
      const tx = await saccoContract.createProposal(groupId, description);
      // In ethers v6, we need to use .wait() differently
      const receipt = await tx.wait();
      if (!receipt) throw new Error("Transaction failed");
      
      // Create proposal in backend
      await apiRequest("POST", "/api/proposals", {
        groupId,
        description,
        deadline: deadline.toISOString(),
        creatorAddress: address
      });
      
      // Add activity record
      await apiRequest("POST", `/api/groups/${groupId}/activities`, {
        userAddress: address,
        activityType: "proposal_created",
        description: `${address} created a new proposal: ${description}`
      });
    } catch (error) {
      console.error("Error creating proposal:", error);
      setError(error instanceof Error ? error.message : "Failed to create proposal");
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [saccoContract, address]);

  const checkIfUserHasVoted = useCallback(async (proposalId: number) => {
    if (!address) return false;
    
    try {
      // Get votes for this proposal
      const response = await apiRequest("GET", `/api/proposals/${proposalId}/votes`);
      const votes = await response.json();
      
      // Check if user has already voted
      return votes.some((vote: any) => vote.voterAddress.toLowerCase() === address.toLowerCase());
    } catch (error) {
      console.error("Error checking if user has voted:", error);
      return false;
    }
  }, [address]);

  const voteOnProposal = useCallback(async (proposalId: number, voteValue: boolean) => {
    if (!saccoContract || !address) {
      throw new Error("Contract not initialized or user not connected");
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if user has already voted
      const hasVoted = await checkIfUserHasVoted(proposalId);
      if (hasVoted) {
        throw new Error("You have already voted on this proposal");
      }
      
      // Get proposal details
      const response = await apiRequest("GET", `/api/proposals/${proposalId}`);
      const proposal = await response.json();
      
      // Vote on blockchain
      const tx = await saccoContract.vote(proposal.groupId, proposalId, voteValue);
      // In ethers v6, we need to use .wait() differently
      const receipt = await tx.wait();
      if (!receipt) throw new Error("Transaction failed");
      
      // Record vote in backend
      await apiRequest("POST", `/api/proposals/${proposalId}/votes`, {
        voterAddress: address,
        vote: voteValue
      });
      
      // Add activity record
      await apiRequest("POST", `/api/groups/${proposal.groupId}/activities`, {
        userAddress: address,
        activityType: "vote_cast",
        description: `${address} voted ${voteValue ? "Yes" : "No"} on proposal: "${proposal.description}"`
      });
    } catch (error) {
      console.error("Error voting on proposal:", error);
      setError(error instanceof Error ? error.message : "Failed to vote on proposal");
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [saccoContract, address, checkIfUserHasVoted]);

  const executeProposal = useCallback(async (proposalId: number) => {
    if (!saccoContract || !address) {
      throw new Error("Contract not initialized or user not connected");
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Get proposal details
      const response = await apiRequest("GET", `/api/proposals/${proposalId}`);
      const proposal = await response.json();
      
      // Execute proposal on blockchain
      const tx = await saccoContract.executeProposal(proposal.groupId, proposalId);
      // In ethers v6, we need to use .wait() differently
      const receipt = await tx.wait();
      if (!receipt) throw new Error("Transaction failed");
      
      // Update proposal status in backend
      await apiRequest("PATCH", `/api/proposals/${proposalId}`, {
        executed: true,
        executorAddress: address
      });
      
      // Add activity record
      await apiRequest("POST", `/api/groups/${proposal.groupId}/activities`, {
        userAddress: address,
        activityType: "proposal_executed",
        description: `${address} executed proposal: "${proposal.description}"`
      });
    } catch (error) {
      console.error("Error executing proposal:", error);
      setError(error instanceof Error ? error.message : "Failed to execute proposal");
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [saccoContract, address]);

  // Group Activity
  const getGroupActivities = useCallback(async (groupId: number, limit = 10) => {
    if (groupId <= 0) return [];
    
    try {
      const response = await apiRequest("GET", `/api/groups/${groupId}/activities?limit=${limit}`);
      return await response.json();
    } catch (error) {
      console.error("Error getting group activities:", error);
      throw new Error("Failed to get group activities");
    }
  }, []);

  // Context value
  const value = {
    contractAddress: CONTRACT_ADDRESS,
    saccoContract,
    gasPrice,
    interestRate,
    loanMultiplierLimit,
    isLoading,
    error,
    
    // User and group functions
    getUserInfo,
    getUserGroup,
    getUserBalance,
    getGroupInfo,
    getGroupMembers,
    getAllGroups,
    
    // Financial operations
    deposit,
    calculateUserInterest,
    withdrawInterest,
    
    // Loan operations
    requestLoan,
    getUserLoans,
    getActiveLoans,
    repayLoan,
    
    // Guarantor operations
    getGuarantorRequests,
    getGuarantorHistory,
    approveGuarantorRequest,
    
    // Proposal operations
    getGroupProposals,
    createProposal,
    voteOnProposal,
    executeProposal,
    checkIfUserHasVoted,
    
    // Group activity
    getGroupActivities
  };

  return <SaccoContext.Provider value={value}>{children}</SaccoContext.Provider>;
};
