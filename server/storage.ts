import {
  users, groups, groupMembers, loans, guarantors, proposals, votes, activities,
  type User, type InsertUser,
  type Group, type InsertGroup,
  type GroupMember, type InsertGroupMember,
  type Loan, type InsertLoan,
  type Guarantor, type InsertGuarantor,
  type Proposal, type InsertProposal,
  type Vote, type InsertVote,
  type Activity, type InsertActivity
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(address: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(address: string, data: Partial<User>): Promise<User | undefined>;
  
  // Group operations
  getGroup(id: number): Promise<Group | undefined>;
  getGroups(): Promise<Group[]>;
  createGroup(group: InsertGroup): Promise<Group>;
  updateGroup(id: number, data: Partial<Group>): Promise<Group | undefined>;
  getGroupMembers(groupId: number): Promise<User[]>;
  addGroupMember(member: InsertGroupMember): Promise<GroupMember>;
  isGroupMember(groupId: number, address: string): Promise<boolean>;
  getUserGroup(address: string): Promise<Group | undefined>;

  // Loan operations
  getLoan(id: number): Promise<Loan | undefined>;
  getUserLoans(address: string): Promise<Loan[]>;
  createLoan(loan: InsertLoan): Promise<Loan>;
  updateLoan(id: number, data: Partial<Loan>): Promise<Loan | undefined>;
  
  // Guarantor operations
  getLoanGuarantors(loanId: number): Promise<Guarantor[]>;
  addGuarantor(guarantor: InsertGuarantor): Promise<Guarantor>;
  updateGuarantor(loanId: number, address: string, approved: boolean): Promise<Guarantor | undefined>;
  
  // Proposal operations
  getProposal(id: number): Promise<Proposal | undefined>;
  getGroupProposals(groupId: number): Promise<Proposal[]>;
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  updateProposal(id: number, data: Partial<Proposal>): Promise<Proposal | undefined>;
  
  // Vote operations
  getVotes(proposalId: number): Promise<Vote[]>;
  addVote(vote: InsertVote): Promise<Vote>;
  hasVoted(proposalId: number, address: string): Promise<boolean>;
  
  // Activity operations
  getGroupActivities(groupId: number, limit?: number): Promise<Activity[]>;
  addActivity(activity: InsertActivity): Promise<Activity>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private groups: Map<number, Group>;
  private groupMembers: Map<number, GroupMember[]>;
  private loans: Map<number, Loan>;
  private loansByBorrower: Map<string, number[]>;
  private guarantors: Map<number, Guarantor[]>;
  private proposals: Map<number, Proposal>;
  private proposalsByGroup: Map<number, number[]>;
  private votes: Map<number, Vote[]>;
  private activities: Map<number, Activity[]>;
  
  private currentIds: {
    user: number;
    group: number;
    groupMember: number;
    loan: number;
    guarantor: number;
    proposal: number;
    vote: number;
    activity: number;
  };

  constructor() {
    this.users = new Map();
    this.groups = new Map();
    this.groupMembers = new Map();
    this.loans = new Map();
    this.loansByBorrower = new Map();
    this.guarantors = new Map();
    this.proposals = new Map();
    this.proposalsByGroup = new Map();
    this.votes = new Map();
    this.activities = new Map();
    
    this.currentIds = {
      user: 1,
      group: 1,
      groupMember: 1,
      loan: 1,
      guarantor: 1,
      proposal: 1,
      vote: 1,
      activity: 1
    };
  }
  
  // User operations
  async getUser(address: string): Promise<User | undefined> {
    return this.users.get(address.toLowerCase());
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    const id = this.currentIds.user++;
    const address = userData.address.toLowerCase();
    const user: User = { ...userData, id, address };
    this.users.set(address, user);
    return user;
  }
  
  async updateUser(address: string, data: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(address);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...data };
    this.users.set(address.toLowerCase(), updatedUser);
    return updatedUser;
  }
  
  // Group operations
  async getGroup(id: number): Promise<Group | undefined> {
    return this.groups.get(id);
  }
  
  async getGroups(): Promise<Group[]> {
    return Array.from(this.groups.values());
  }
  
  async createGroup(groupData: InsertGroup): Promise<Group> {
    const id = this.currentIds.group++;
    const group: Group = { ...groupData, id, totalDeposits: 0, totalLoaned: 0 };
    this.groups.set(id, group);
    this.groupMembers.set(id, []);
    this.proposalsByGroup.set(id, []);
    
    // Add group admin as the first member
    await this.addGroupMember({ groupId: id, memberAddress: groupData.admin });
    
    return group;
  }
  
  async updateGroup(id: number, data: Partial<Group>): Promise<Group | undefined> {
    const group = await this.getGroup(id);
    if (!group) return undefined;
    
    const updatedGroup = { ...group, ...data };
    this.groups.set(id, updatedGroup);
    return updatedGroup;
  }
  
  async getGroupMembers(groupId: number): Promise<User[]> {
    const members = this.groupMembers.get(groupId) || [];
    const users: User[] = [];
    
    for (const member of members) {
      const user = await this.getUser(member.memberAddress);
      if (user) {
        users.push(user);
      }
    }
    
    return users;
  }
  
  async addGroupMember(memberData: InsertGroupMember): Promise<GroupMember> {
    const id = this.currentIds.groupMember++;
    const member: GroupMember = { ...memberData, id };
    
    const members = this.groupMembers.get(memberData.groupId) || [];
    members.push(member);
    this.groupMembers.set(memberData.groupId, members);
    
    return member;
  }
  
  async isGroupMember(groupId: number, address: string): Promise<boolean> {
    const members = this.groupMembers.get(groupId) || [];
    return members.some(m => m.memberAddress.toLowerCase() === address.toLowerCase());
  }
  
  async getUserGroup(address: string): Promise<Group | undefined> {
    for (const [groupId, members] of this.groupMembers.entries()) {
      if (members.some(m => m.memberAddress.toLowerCase() === address.toLowerCase())) {
        return this.getGroup(groupId);
      }
    }
    return undefined;
  }
  
  // Loan operations
  async getLoan(id: number): Promise<Loan | undefined> {
    return this.loans.get(id);
  }
  
  async getUserLoans(address: string): Promise<Loan[]> {
    const loanIds = this.loansByBorrower.get(address.toLowerCase()) || [];
    const loans: Loan[] = [];
    
    for (const id of loanIds) {
      const loan = await this.getLoan(id);
      if (loan) {
        loans.push(loan);
      }
    }
    
    return loans;
  }
  
  async createLoan(loanData: InsertLoan): Promise<Loan> {
    const id = this.currentIds.loan++;
    const loan: Loan = { ...loanData, id, createdAt: new Date() };
    this.loans.set(id, loan);
    
    const borrower = loanData.borrowerAddress.toLowerCase();
    const loanIds = this.loansByBorrower.get(borrower) || [];
    loanIds.push(id);
    this.loansByBorrower.set(borrower, loanIds);
    
    this.guarantors.set(id, []);
    
    return loan;
  }
  
  async updateLoan(id: number, data: Partial<Loan>): Promise<Loan | undefined> {
    const loan = await this.getLoan(id);
    if (!loan) return undefined;
    
    const updatedLoan = { ...loan, ...data };
    this.loans.set(id, updatedLoan);
    return updatedLoan;
  }
  
  // Guarantor operations
  async getLoanGuarantors(loanId: number): Promise<Guarantor[]> {
    return this.guarantors.get(loanId) || [];
  }
  
  async addGuarantor(guarantorData: InsertGuarantor): Promise<Guarantor> {
    const id = this.currentIds.guarantor++;
    const guarantor: Guarantor = { ...guarantorData, id };
    
    const guarantors = this.guarantors.get(guarantorData.loanId) || [];
    guarantors.push(guarantor);
    this.guarantors.set(guarantorData.loanId, guarantors);
    
    return guarantor;
  }
  
  async updateGuarantor(loanId: number, address: string, approved: boolean): Promise<Guarantor | undefined> {
    const guarantors = this.guarantors.get(loanId) || [];
    const index = guarantors.findIndex(g => g.guarantorAddress.toLowerCase() === address.toLowerCase());
    
    if (index === -1) return undefined;
    
    const guarantor = guarantors[index];
    const updatedGuarantor = { ...guarantor, approved };
    guarantors[index] = updatedGuarantor;
    
    this.guarantors.set(loanId, guarantors);
    return updatedGuarantor;
  }
  
  // Proposal operations
  async getProposal(id: number): Promise<Proposal | undefined> {
    return this.proposals.get(id);
  }
  
  async getGroupProposals(groupId: number): Promise<Proposal[]> {
    const proposalIds = this.proposalsByGroup.get(groupId) || [];
    const proposals: Proposal[] = [];
    
    for (const id of proposalIds) {
      const proposal = await this.getProposal(id);
      if (proposal) {
        proposals.push(proposal);
      }
    }
    
    return proposals;
  }
  
  async createProposal(proposalData: InsertProposal): Promise<Proposal> {
    const id = this.currentIds.proposal++;
    const proposal: Proposal = {
      ...proposalData,
      id,
      votesYes: 0,
      votesNo: 0,
      executed: false,
      createdAt: new Date()
    };
    
    this.proposals.set(id, proposal);
    
    const proposalIds = this.proposalsByGroup.get(proposalData.groupId) || [];
    proposalIds.push(id);
    this.proposalsByGroup.set(proposalData.groupId, proposalIds);
    
    this.votes.set(id, []);
    
    return proposal;
  }
  
  async updateProposal(id: number, data: Partial<Proposal>): Promise<Proposal | undefined> {
    const proposal = await this.getProposal(id);
    if (!proposal) return undefined;
    
    const updatedProposal = { ...proposal, ...data };
    this.proposals.set(id, updatedProposal);
    return updatedProposal;
  }
  
  // Vote operations
  async getVotes(proposalId: number): Promise<Vote[]> {
    return this.votes.get(proposalId) || [];
  }
  
  async addVote(voteData: InsertVote): Promise<Vote> {
    const id = this.currentIds.vote++;
    const vote: Vote = { ...voteData, id };
    
    const votes = this.votes.get(voteData.proposalId) || [];
    votes.push(vote);
    this.votes.set(voteData.proposalId, votes);
    
    // Update proposal vote counts
    const proposal = await this.getProposal(voteData.proposalId);
    if (proposal) {
      const votesYes = voteData.vote ? proposal.votesYes + 1 : proposal.votesYes;
      const votesNo = !voteData.vote ? proposal.votesNo + 1 : proposal.votesNo;
      await this.updateProposal(voteData.proposalId, { votesYes, votesNo });
    }
    
    return vote;
  }
  
  async hasVoted(proposalId: number, address: string): Promise<boolean> {
    const votes = this.votes.get(proposalId) || [];
    return votes.some(v => v.voterAddress.toLowerCase() === address.toLowerCase());
  }
  
  // Activity operations
  async getGroupActivities(groupId: number, limit = 10): Promise<Activity[]> {
    const activities = this.activities.get(groupId) || [];
    return [...activities].sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    ).slice(0, limit);
  }
  
  async addActivity(activityData: InsertActivity): Promise<Activity> {
    const id = this.currentIds.activity++;
    const activity: Activity = { ...activityData, id, timestamp: new Date() };
    
    const activities = this.activities.get(activityData.groupId) || [];
    activities.push(activity);
    this.activities.set(activityData.groupId, activities);
    
    return activity;
  }
}

export class DatabaseStorage implements IStorage {
  // USER OPERATIONS
  
  async getUser(address: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.address, address.toLowerCase()));
    return user || undefined;
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    // Ensure address is lowercase
    const data = { ...userData, address: userData.address.toLowerCase() };
    const [user] = await db
      .insert(users)
      .values(data)
      .returning();
    return user;
  }
  
  async updateUser(address: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.address, address.toLowerCase()))
      .returning();
    return user || undefined;
  }

  // GROUP OPERATIONS
  
  async getGroup(id: number): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group || undefined;
  }
  
  async getGroups(): Promise<Group[]> {
    return db.select().from(groups);
  }
  
  async createGroup(groupData: InsertGroup): Promise<Group> {
    // Start a transaction to create the group and add the admin as a member
    return db.transaction(async (tx) => {
      const [group] = await tx
        .insert(groups)
        .values(groupData)
        .returning();
      
      // Add admin as the first member
      await tx
        .insert(groupMembers)
        .values({
          groupId: group.id,
          memberAddress: groupData.admin.toLowerCase()
        });
        
      return group;
    });
  }
  
  async updateGroup(id: number, data: Partial<Group>): Promise<Group | undefined> {
    const [group] = await db
      .update(groups)
      .set(data)
      .where(eq(groups.id, id))
      .returning();
    return group || undefined;
  }
  
  async getGroupMembers(groupId: number): Promise<User[]> {
    const memberRows = await db
      .select({
        user: users
      })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.memberAddress, users.address))
      .where(eq(groupMembers.groupId, groupId));
    
    return memberRows.map(row => row.user);
  }
  
  async addGroupMember(memberData: InsertGroupMember): Promise<GroupMember> {
    const [member] = await db
      .insert(groupMembers)
      .values({
        ...memberData,
        memberAddress: memberData.memberAddress.toLowerCase()
      })
      .returning();
    return member;
  }
  
  async isGroupMember(groupId: number, address: string): Promise<boolean> {
    const [member] = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.memberAddress, address.toLowerCase())
        )
      );
    return !!member;
  }
  
  async getUserGroup(address: string): Promise<Group | undefined> {
    const [groupRow] = await db
      .select({
        group: groups
      })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(eq(groupMembers.memberAddress, address.toLowerCase()));
    
    return groupRow ? groupRow.group : undefined;
  }

  // LOAN OPERATIONS
  
  async getLoan(id: number): Promise<Loan | undefined> {
    const [loan] = await db.select().from(loans).where(eq(loans.id, id));
    return loan || undefined;
  }
  
  async getUserLoans(address: string): Promise<Loan[]> {
    return db
      .select()
      .from(loans)
      .where(eq(loans.borrowerAddress, address.toLowerCase()));
  }
  
  async createLoan(loanData: InsertLoan): Promise<Loan> {
    const [loan] = await db
      .insert(loans)
      .values({
        ...loanData,
        borrowerAddress: loanData.borrowerAddress.toLowerCase()
      })
      .returning();
    return loan;
  }
  
  async updateLoan(id: number, data: Partial<Loan>): Promise<Loan | undefined> {
    const [loan] = await db
      .update(loans)
      .set(data)
      .where(eq(loans.id, id))
      .returning();
    return loan || undefined;
  }

  // GUARANTOR OPERATIONS
  
  async getLoanGuarantors(loanId: number): Promise<Guarantor[]> {
    return db
      .select()
      .from(guarantors)
      .where(eq(guarantors.loanId, loanId));
  }
  
  async addGuarantor(guarantorData: InsertGuarantor): Promise<Guarantor> {
    const [guarantor] = await db
      .insert(guarantors)
      .values({
        ...guarantorData,
        guarantorAddress: guarantorData.guarantorAddress.toLowerCase()
      })
      .returning();
    return guarantor;
  }
  
  async updateGuarantor(
    loanId: number,
    address: string,
    approved: boolean
  ): Promise<Guarantor | undefined> {
    const [guarantor] = await db
      .update(guarantors)
      .set({ approved })
      .where(
        and(
          eq(guarantors.loanId, loanId),
          eq(guarantors.guarantorAddress, address.toLowerCase())
        )
      )
      .returning();
    return guarantor || undefined;
  }

  // PROPOSAL OPERATIONS
  
  async getProposal(id: number): Promise<Proposal | undefined> {
    const [proposal] = await db.select().from(proposals).where(eq(proposals.id, id));
    return proposal || undefined;
  }
  
  async getGroupProposals(groupId: number): Promise<Proposal[]> {
    return db
      .select()
      .from(proposals)
      .where(eq(proposals.groupId, groupId));
  }
  
  async createProposal(proposalData: InsertProposal): Promise<Proposal> {
    const [proposal] = await db
      .insert(proposals)
      .values({
        ...proposalData,
        executed: false,
        executorAddress: null,
        votesYes: 0,
        votesNo: 0
      })
      .returning();
    return proposal;
  }
  
  async updateProposal(id: number, data: Partial<Proposal>): Promise<Proposal | undefined> {
    const [proposal] = await db
      .update(proposals)
      .set(data)
      .where(eq(proposals.id, id))
      .returning();
    return proposal || undefined;
  }

  // VOTE OPERATIONS
  
  async getVotes(proposalId: number): Promise<Vote[]> {
    return db
      .select()
      .from(votes)
      .where(eq(votes.proposalId, proposalId));
  }
  
  async addVote(voteData: InsertVote): Promise<Vote> {
    // Start a transaction to update both the votes table and the proposal vote counts
    return db.transaction(async (tx) => {
      // Add the vote with lowercase address
      const [vote] = await tx
        .insert(votes)
        .values({
          ...voteData,
          voterAddress: voteData.voterAddress.toLowerCase()
        })
        .returning();
      
      // Update proposal vote counts
      if (voteData.vote) {
        await tx
          .update(proposals)
          .set({ votesYes: sql`"votesYes" + 1` })
          .where(eq(proposals.id, voteData.proposalId));
      } else {
        await tx
          .update(proposals)
          .set({ votesNo: sql`"votesNo" + 1` })
          .where(eq(proposals.id, voteData.proposalId));
      }
      
      return vote;
    });
  }
  
  async hasVoted(proposalId: number, address: string): Promise<boolean> {
    const [vote] = await db
      .select()
      .from(votes)
      .where(
        and(
          eq(votes.proposalId, proposalId),
          eq(votes.voterAddress, address.toLowerCase())
        )
      );
    return !!vote;
  }

  // ACTIVITY OPERATIONS
  
  async getGroupActivities(groupId: number, limit = 10): Promise<Activity[]> {
    return db
      .select()
      .from(activities)
      .where(eq(activities.groupId, groupId))
      .orderBy(desc(activities.timestamp))
      .limit(limit);
  }
  
  async addActivity(activityData: InsertActivity): Promise<Activity> {
    const [activity] = await db
      .insert(activities)
      .values({
        ...activityData,
        userAddress: activityData.userAddress.toLowerCase()
      })
      .returning();
    return activity;
  }
}

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();
