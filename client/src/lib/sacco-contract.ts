import { ethers, Contract, ContractTransaction } from "ethers";
import type { Provider, Signer } from "./web3";

// SaccoDAO ABI (Application Binary Interface)
const SaccoDAOABI = [
  // Group functions
  "function createGroup(string memory name) external",
  "function joinGroup(uint256 groupId) external",
  
  // Member info
  "function members(address) external view returns (address wallet, uint256 totalDeposits, uint256 creditScore, uint256 lastDepositTime, bool registered, bool isDefaulted, uint256 groupId)",
  
  // Deposit/Withdraw
  "function deposit(uint256 amount) external",
  "function calculateInterest(address user) public view returns (uint256)",
  "function withdrawInterest() external",
  
  // Group info
  "function groups(uint256) external view returns (string memory name, address admin, uint256 totalDeposits, uint256 totalLoaned)",
  "function groupCount() external view returns (uint256)",
  
  // Loan functions
  "function requestLoan(uint256 amount, uint256 durationDays, address[] memory guarantors) external",
  "function approveAsGuarantor(address borrower, uint256 index) external",
  "function approveLoan(address borrower, uint256 index) external",
  "function repayLoan(uint256 index) external",
  "function markDefault(address borrower, uint256 index) external",
  
  // Loan info
  "function loans(address, uint256) external view returns (uint256 amount, uint256 dueDate, bool repaid, bool approved, bool defaulted)",
  
  // Proposal functions
  "function createProposal(uint256 groupId, string memory desc) external",
  "function vote(uint256 groupId, uint256 proposalId, bool approve) external",
  "function executeProposal(uint256 groupId, uint256 proposalId) external",
  
  // Constants
  "function interestRate() external view returns (uint256)",
  "function loanMultiplierLimit() external view returns (uint256)",
  "function stablecoin() external view returns (address)"
];

// ERC20 ABI for the stablecoin
const ERC20ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address sender, address recipient, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)"
];

export class SaccoContract {
  private provider: Provider;
  private signer: Signer;
  private contract: Contract | null = null;
  private stablecoinContract: Contract | null = null;
  private contractAddress: string;

  constructor(provider: Provider, signer: Signer, contractAddress: string) {
    this.provider = provider;
    this.signer = signer;
    this.contractAddress = contractAddress;
    
    if (provider && signer) {
      this.initContracts();
    }
  }

  private async initContracts() {
    try {
      // Initialize SaccoDAO contract
      this.contract = new Contract(
        this.contractAddress,
        SaccoDAOABI,
        this.signer as ethers.Signer
      );
      
      // Get stablecoin address from SaccoDAO contract
      const stablecoinAddress = await this.contract.stablecoin();
      
      // Initialize stablecoin contract
      this.stablecoinContract = new Contract(
        stablecoinAddress,
        ERC20ABI,
        this.signer as ethers.Signer
      );
    } catch (error) {
      console.error("Error initializing contracts:", error);
      throw new Error("Failed to initialize smart contracts");
    }
  }

  // Update provider and signer
  public updateProviderAndSigner(provider: Provider, signer: Signer) {
    this.provider = provider;
    this.signer = signer;
    
    if (provider && signer) {
      this.initContracts();
    } else {
      this.contract = null;
      this.stablecoinContract = null;
    }
  }

  // Get contract address
  public getContractAddress(): string {
    return this.contractAddress;
  }

  // STABLECOIN FUNCTIONS
  
  // Get stablecoin balance
  public async getStablecoinBalance(address: string): Promise<number> {
    this.ensureContractsInitialized();
    try {
      const balance = await this.stablecoinContract!.balanceOf(address);
      const decimals = await this.stablecoinContract!.decimals();
      return parseFloat(ethers.formatUnits(balance, decimals));
    } catch (error) {
      console.error("Error getting balance:", error);
      throw new Error("Failed to get token balance");
    }
  }
  
  // Get stablecoin symbol
  public async getStablecoinSymbol(): Promise<string> {
    this.ensureContractsInitialized();
    try {
      return await this.stablecoinContract!.symbol();
    } catch (error) {
      console.error("Error getting symbol:", error);
      throw new Error("Failed to get token symbol");
    }
  }
  
  // Check stablecoin allowance
  public async checkAllowance(owner: string): Promise<number> {
    this.ensureContractsInitialized();
    try {
      const allowance = await this.stablecoinContract!.allowance(owner, this.contractAddress);
      const decimals = await this.stablecoinContract!.decimals();
      return parseFloat(ethers.formatUnits(allowance, decimals));
    } catch (error) {
      console.error("Error checking allowance:", error);
      throw new Error("Failed to check token allowance");
    }
  }
  
  // Approve stablecoin spending
  public async approveStablecoin(amount: number): Promise<ContractTransaction> {
    this.ensureContractsInitialized();
    try {
      const decimals = await this.stablecoinContract!.decimals();
      const amountInWei = ethers.parseUnits(amount.toString(), decimals);
      return await this.stablecoinContract!.approve(this.contractAddress, amountInWei);
    } catch (error) {
      console.error("Error approving tokens:", error);
      throw new Error("Failed to approve token spending");
    }
  }

  // GROUP FUNCTIONS
  
  // Create a new group
  public async createGroup(name: string): Promise<ethers.ContractTransaction> {
    this.ensureContractsInitialized();
    try {
      return await this.contract!.createGroup(name);
    } catch (error) {
      console.error("Error creating group:", error);
      throw new Error("Failed to create group");
    }
  }
  
  // Join an existing group
  public async joinGroup(groupId: number): Promise<ethers.ContractTransaction> {
    this.ensureContractsInitialized();
    try {
      return await this.contract!.joinGroup(groupId);
    } catch (error) {
      console.error("Error joining group:", error);
      throw new Error("Failed to join group");
    }
  }
  
  // Get group info
  public async getGroup(groupId: number): Promise<{
    name: string;
    admin: string;
    totalDeposits: number;
    totalLoaned: number;
  }> {
    this.ensureContractsInitialized();
    try {
      const group = await this.contract!.groups(groupId);
      return {
        name: group.name,
        admin: group.admin,
        totalDeposits: parseFloat(ethers.formatUnits(group.totalDeposits, 6)),
        totalLoaned: parseFloat(ethers.formatUnits(group.totalLoaned, 6))
      };
    } catch (error) {
      console.error("Error getting group:", error);
      throw new Error("Failed to get group information");
    }
  }
  
  // Get total group count
  public async getGroupCount(): Promise<number> {
    this.ensureContractsInitialized();
    try {
      const count = await this.contract!.groupCount();
      return count.toNumber();
    } catch (error) {
      console.error("Error getting group count:", error);
      throw new Error("Failed to get group count");
    }
  }

  // MEMBER FUNCTIONS
  
  // Get member info
  public async getMember(address: string): Promise<{
    wallet: string;
    totalDeposits: number;
    creditScore: number;
    lastDepositTime: Date;
    registered: boolean;
    isDefaulted: boolean;
    groupId: number;
  }> {
    this.ensureContractsInitialized();
    try {
      const member = await this.contract!.members(address);
      return {
        wallet: member.wallet,
        totalDeposits: parseFloat(ethers.formatUnits(member.totalDeposits, 6)),
        creditScore: member.creditScore.toNumber(),
        lastDepositTime: new Date(member.lastDepositTime.toNumber() * 1000),
        registered: member.registered,
        isDefaulted: member.isDefaulted,
        groupId: member.groupId.toNumber()
      };
    } catch (error) {
      console.error("Error getting member:", error);
      throw new Error("Failed to get member information");
    }
  }
  
  // DEPOSIT FUNCTIONS
  
  // Deposit funds into the contract
  public async deposit(amount: number): Promise<ContractTransaction> {
    this.ensureContractsInitialized();
    try {
      // First ensure allowance is sufficient
      const signer = await this.signer!.getAddress();
      const allowance = await this.checkAllowance(signer);
      
      if (allowance < amount) {
        // Approve tokens first
        const approveTx = await this.approveStablecoin(amount);
        // In ethers v6, we need to use .wait() differently
        const receipt = await approveTx.wait();
        if (!receipt) throw new Error("Transaction failed");
      }
      
      // Then deposit
      const amountInWei = ethers.parseUnits(amount.toString(), 6);
      return await this.contract!.deposit(amountInWei);
    } catch (error) {
      console.error("Error depositing:", error);
      throw new Error("Failed to deposit funds");
    }
  }
  
  // Calculate earned interest
  public async calculateInterest(address: string): Promise<number> {
    this.ensureContractsInitialized();
    try {
      const interest = await this.contract!.calculateInterest(address);
      return parseFloat(ethers.formatUnits(interest, 6));
    } catch (error) {
      console.error("Error calculating interest:", error);
      throw new Error("Failed to calculate interest");
    }
  }
  
  // Withdraw earned interest
  public async withdrawInterest(): Promise<ethers.ContractTransaction> {
    this.ensureContractsInitialized();
    try {
      return await this.contract!.withdrawInterest();
    } catch (error) {
      console.error("Error withdrawing interest:", error);
      throw new Error("Failed to withdraw interest");
    }
  }

  // LOAN FUNCTIONS
  
  // Request a loan
  public async requestLoan(
    amount: number,
    durationDays: number,
    guarantors: string[]
  ): Promise<ethers.ContractTransaction> {
    this.ensureContractsInitialized();
    try {
      const amountInWei = ethers.parseUnits(amount.toString(), 6);
      return await this.contract!.requestLoan(amountInWei, durationDays, guarantors);
    } catch (error) {
      console.error("Error requesting loan:", error);
      throw new Error("Failed to request loan");
    }
  }
  
  // Approve as guarantor
  public async approveAsGuarantor(
    borrower: string,
    loanIndex: number
  ): Promise<ethers.ContractTransaction> {
    this.ensureContractsInitialized();
    try {
      return await this.contract!.approveAsGuarantor(borrower, loanIndex);
    } catch (error) {
      console.error("Error approving as guarantor:", error);
      throw new Error("Failed to approve as guarantor");
    }
  }
  
  // Approve loan (admin only)
  public async approveLoan(
    borrower: string,
    loanIndex: number
  ): Promise<ethers.ContractTransaction> {
    this.ensureContractsInitialized();
    try {
      return await this.contract!.approveLoan(borrower, loanIndex);
    } catch (error) {
      console.error("Error approving loan:", error);
      throw new Error("Failed to approve loan");
    }
  }
  
  // Repay loan
  public async repayLoan(loanIndex: number): Promise<ethers.ContractTransaction> {
    this.ensureContractsInitialized();
    try {
      // Get loan details
      const address = await this.signer!.getAddress();
      const loan = await this.contract!.loans(address, loanIndex);
      
      // Check allowance
      const allowance = await this.checkAllowance(address);
      const amount = parseFloat(ethers.formatUnits(loan.amount, 6));
      
      if (allowance < amount) {
        // Approve tokens first
        const approveTx = await this.approveStablecoin(amount);
        // In ethers v6, we need to use .wait() differently
        const receipt = await approveTx.wait();
        if (!receipt) throw new Error("Transaction failed");
      }
      
      // Repay loan
      return await this.contract!.repayLoan(loanIndex);
    } catch (error) {
      console.error("Error repaying loan:", error);
      throw new Error("Failed to repay loan");
    }
  }
  
  // Mark loan as defaulted
  public async markDefault(
    borrower: string,
    loanIndex: number
  ): Promise<ethers.ContractTransaction> {
    this.ensureContractsInitialized();
    try {
      return await this.contract!.markDefault(borrower, loanIndex);
    } catch (error) {
      console.error("Error marking default:", error);
      throw new Error("Failed to mark loan as defaulted");
    }
  }

  // PROPOSAL FUNCTIONS
  
  // Create a proposal
  public async createProposal(
    groupId: number,
    description: string
  ): Promise<ethers.ContractTransaction> {
    this.ensureContractsInitialized();
    try {
      return await this.contract!.createProposal(groupId, description);
    } catch (error) {
      console.error("Error creating proposal:", error);
      throw new Error("Failed to create proposal");
    }
  }
  
  // Vote on a proposal
  public async vote(
    groupId: number,
    proposalId: number,
    approve: boolean
  ): Promise<ethers.ContractTransaction> {
    this.ensureContractsInitialized();
    try {
      return await this.contract!.vote(groupId, proposalId, approve);
    } catch (error) {
      console.error("Error voting:", error);
      throw new Error("Failed to vote on proposal");
    }
  }
  
  // Execute a proposal
  public async executeProposal(
    groupId: number,
    proposalId: number
  ): Promise<ethers.ContractTransaction> {
    this.ensureContractsInitialized();
    try {
      return await this.contract!.executeProposal(groupId, proposalId);
    } catch (error) {
      console.error("Error executing proposal:", error);
      throw new Error("Failed to execute proposal");
    }
  }

  // CONSTANTS
  
  // Get interest rate
  public async getInterestRate(): Promise<number> {
    this.ensureContractsInitialized();
    try {
      const rate = await this.contract!.interestRate();
      return rate.toNumber();
    } catch (error) {
      console.error("Error getting interest rate:", error);
      throw new Error("Failed to get interest rate");
    }
  }
  
  // Get loan multiplier limit
  public async getLoanMultiplierLimit(): Promise<number> {
    this.ensureContractsInitialized();
    try {
      const limit = await this.contract!.loanMultiplierLimit();
      return limit.toNumber();
    } catch (error) {
      console.error("Error getting loan multiplier limit:", error);
      throw new Error("Failed to get loan multiplier limit");
    }
  }

  // Verify contracts are initialized
  private ensureContractsInitialized() {
    if (!this.contract || !this.stablecoinContract) {
      throw new Error("Contracts not initialized. Please connect your wallet first.");
    }
  }
}
