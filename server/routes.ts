import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertGroupSchema,
  insertGroupMemberSchema,
  insertLoanSchema,
  insertGuarantorSchema,
  insertProposalSchema,
  insertVoteSchema,
  insertActivitySchema
} from "@shared/schema";
import { ZodError } from "zod";

// Helper function to handle Zod validation
function validateRequest<T>(schema: any, data: any): { success: boolean; data?: T; error?: string } {
  try {
    const validData = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Invalid data format" };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // User Routes
  app.post("/api/users", async (req: Request, res: Response) => {
    const validation = validateRequest(insertUserSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ message: validation.error });
    }
    
    try {
      const existingUser = await storage.getUser(validation.data!.address);
      if (existingUser) {
        return res.json(existingUser);
      }
      
      const user = await storage.createUser(validation.data!);
      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to create user" });
    }
  });
  
  app.get("/api/users/:address", async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.params.address);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });
  
  app.patch("/api/users/:address", async (req: Request, res: Response) => {
    try {
      const user = await storage.updateUser(req.params.address, req.body);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  
  // Group Routes
  app.post("/api/groups", async (req: Request, res: Response) => {
    const validation = validateRequest(insertGroupSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ message: validation.error });
    }
    
    try {
      const group = await storage.createGroup(validation.data!);
      
      // Add activity for group creation
      await storage.addActivity({
        groupId: group.id,
        userAddress: group.admin,
        activityType: "create_group",
        description: `${group.admin} created group ${group.name}`
      });
      
      res.status(201).json(group);
    } catch (error) {
      res.status(500).json({ message: "Failed to create group" });
    }
  });
  
  app.get("/api/groups", async (_req: Request, res: Response) => {
    try {
      const groups = await storage.getGroups();
      res.json(groups);
    } catch (error) {
      res.status(500).json({ message: "Failed to get groups" });
    }
  });
  
  app.get("/api/groups/:id", async (req: Request, res: Response) => {
    try {
      const group = await storage.getGroup(parseInt(req.params.id));
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      res.json(group);
    } catch (error) {
      res.status(500).json({ message: "Failed to get group" });
    }
  });
  
  app.get("/api/groups/:id/members", async (req: Request, res: Response) => {
    try {
      const members = await storage.getGroupMembers(parseInt(req.params.id));
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to get group members" });
    }
  });
  
  app.post("/api/groups/:id/members", async (req: Request, res: Response) => {
    const validation = validateRequest(insertGroupMemberSchema, {
      groupId: parseInt(req.params.id),
      memberAddress: req.body.memberAddress
    });
    
    if (!validation.success) {
      return res.status(400).json({ message: validation.error });
    }
    
    try {
      const group = await storage.getGroup(parseInt(req.params.id));
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      const isMember = await storage.isGroupMember(group.id, validation.data!.memberAddress);
      if (isMember) {
        return res.status(400).json({ message: "Already a member of this group" });
      }
      
      const member = await storage.addGroupMember(validation.data!);
      
      // Update user with group info
      await storage.updateUser(validation.data!.memberAddress, {
        groupId: group.id,
        registered: true
      });
      
      // Add activity for joining group
      await storage.addActivity({
        groupId: group.id,
        userAddress: validation.data!.memberAddress,
        activityType: "join_group",
        description: `${validation.data!.memberAddress} joined the group`
      });
      
      res.status(201).json(member);
    } catch (error) {
      res.status(500).json({ message: "Failed to add group member" });
    }
  });
  
  app.get("/api/users/:address/group", async (req: Request, res: Response) => {
    try {
      const group = await storage.getUserGroup(req.params.address);
      if (!group) {
        return res.status(404).json({ message: "User not in any group" });
      }
      res.json(group);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user group" });
    }
  });
  
  // Loan Routes
  app.post("/api/loans", async (req: Request, res: Response) => {
    const validation = validateRequest(insertLoanSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ message: validation.error });
    }
    
    try {
      const loan = await storage.createLoan(validation.data!);
      
      // Add guarantors if provided
      if (req.body.guarantors && Array.isArray(req.body.guarantors)) {
        for (const guarantorAddress of req.body.guarantors) {
          await storage.addGuarantor({
            loanId: loan.id,
            guarantorAddress,
            approved: false
          });
        }
      }
      
      // Add activity for loan request
      const user = await storage.getUser(validation.data!.borrowerAddress);
      if (user && user.groupId) {
        await storage.addActivity({
          groupId: user.groupId,
          userAddress: validation.data!.borrowerAddress,
          activityType: "loan_request",
          description: `${validation.data!.borrowerAddress} requested a loan of ${validation.data!.amount} USDC`
        });
      }
      
      res.status(201).json(loan);
    } catch (error) {
      res.status(500).json({ message: "Failed to create loan" });
    }
  });
  
  app.get("/api/users/:address/loans", async (req: Request, res: Response) => {
    try {
      const loans = await storage.getUserLoans(req.params.address);
      
      // Fetch guarantors for each loan
      const loansWithGuarantors = await Promise.all(loans.map(async (loan) => {
        const guarantors = await storage.getLoanGuarantors(loan.id);
        return {
          ...loan,
          guarantors
        };
      }));
      
      res.json(loansWithGuarantors);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user loans" });
    }
  });
  
  app.get("/api/loans/:id", async (req: Request, res: Response) => {
    try {
      const loan = await storage.getLoan(parseInt(req.params.id));
      if (!loan) {
        return res.status(404).json({ message: "Loan not found" });
      }
      
      const guarantors = await storage.getLoanGuarantors(loan.id);
      res.json({
        ...loan,
        guarantors
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get loan" });
    }
  });
  
  app.patch("/api/loans/:id", async (req: Request, res: Response) => {
    try {
      const loan = await storage.updateLoan(parseInt(req.params.id), req.body);
      if (!loan) {
        return res.status(404).json({ message: "Loan not found" });
      }
      
      // Add activity for loan status update
      const user = await storage.getUser(loan.borrowerAddress);
      if (user && user.groupId) {
        let activityType = "loan_update";
        let description = `Loan ${loan.id} was updated`;
        
        if (req.body.approved) {
          activityType = "loan_approved";
          description = `Loan for ${loan.borrowerAddress} was approved`;
        } else if (req.body.repaid) {
          activityType = "loan_repaid";
          description = `${loan.borrowerAddress} repaid loan of ${loan.amount} USDC`;
        } else if (req.body.defaulted) {
          activityType = "loan_defaulted";
          description = `${loan.borrowerAddress} defaulted on loan of ${loan.amount} USDC`;
        }
        
        await storage.addActivity({
          groupId: user.groupId,
          userAddress: loan.borrowerAddress,
          activityType,
          description
        });
      }
      
      res.json(loan);
    } catch (error) {
      res.status(500).json({ message: "Failed to update loan" });
    }
  });
  
  // Guarantor Routes
  app.post("/api/loans/:id/guarantors", async (req: Request, res: Response) => {
    const validation = validateRequest(insertGuarantorSchema, {
      loanId: parseInt(req.params.id),
      guarantorAddress: req.body.guarantorAddress,
      approved: req.body.approved || false
    });
    
    if (!validation.success) {
      return res.status(400).json({ message: validation.error });
    }
    
    try {
      const loan = await storage.getLoan(parseInt(req.params.id));
      if (!loan) {
        return res.status(404).json({ message: "Loan not found" });
      }
      
      const guarantor = await storage.addGuarantor(validation.data!);
      
      // Add activity for guarantor addition
      const user = await storage.getUser(loan.borrowerAddress);
      if (user && user.groupId) {
        await storage.addActivity({
          groupId: user.groupId,
          userAddress: validation.data!.guarantorAddress,
          activityType: "guarantor_added",
          description: `${validation.data!.guarantorAddress} was added as guarantor for ${loan.borrowerAddress}'s loan`
        });
      }
      
      res.status(201).json(guarantor);
    } catch (error) {
      res.status(500).json({ message: "Failed to add guarantor" });
    }
  });
  
  app.patch("/api/loans/:id/guarantors/:address", async (req: Request, res: Response) => {
    try {
      const guarantor = await storage.updateGuarantor(
        parseInt(req.params.id),
        req.params.address,
        req.body.approved
      );
      
      if (!guarantor) {
        return res.status(404).json({ message: "Guarantor not found" });
      }
      
      // Add activity for guarantor approval
      const loan = await storage.getLoan(parseInt(req.params.id));
      if (loan) {
        const user = await storage.getUser(loan.borrowerAddress);
        if (user && user.groupId && req.body.approved) {
          await storage.addActivity({
            groupId: user.groupId,
            userAddress: req.params.address,
            activityType: "guarantor_approved",
            description: `${req.params.address} approved loan for ${loan.borrowerAddress}`
          });
        }
      }
      
      res.json(guarantor);
    } catch (error) {
      res.status(500).json({ message: "Failed to update guarantor" });
    }
  });
  
  // Proposal Routes
  app.post("/api/proposals", async (req: Request, res: Response) => {
    const validation = validateRequest(insertProposalSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ message: validation.error });
    }
    
    try {
      const proposal = await storage.createProposal(validation.data!);
      
      // Add activity for proposal creation
      await storage.addActivity({
        groupId: validation.data!.groupId,
        userAddress: req.body.creatorAddress,
        activityType: "proposal_created",
        description: `New proposal: ${validation.data!.description}`
      });
      
      res.status(201).json(proposal);
    } catch (error) {
      res.status(500).json({ message: "Failed to create proposal" });
    }
  });
  
  app.get("/api/groups/:id/proposals", async (req: Request, res: Response) => {
    try {
      const proposals = await storage.getGroupProposals(parseInt(req.params.id));
      res.json(proposals);
    } catch (error) {
      res.status(500).json({ message: "Failed to get group proposals" });
    }
  });
  
  app.patch("/api/proposals/:id", async (req: Request, res: Response) => {
    try {
      const proposal = await storage.updateProposal(parseInt(req.params.id), req.body);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      
      // Add activity for proposal execution
      if (req.body.executed) {
        await storage.addActivity({
          groupId: proposal.groupId,
          userAddress: req.body.executorAddress,
          activityType: "proposal_executed",
          description: `Proposal "${proposal.description}" was executed`
        });
      }
      
      res.json(proposal);
    } catch (error) {
      res.status(500).json({ message: "Failed to update proposal" });
    }
  });
  
  // Vote Routes
  app.post("/api/proposals/:id/votes", async (req: Request, res: Response) => {
    const validation = validateRequest(insertVoteSchema, {
      proposalId: parseInt(req.params.id),
      voterAddress: req.body.voterAddress,
      vote: req.body.vote
    });
    
    if (!validation.success) {
      return res.status(400).json({ message: validation.error });
    }
    
    try {
      const proposal = await storage.getProposal(parseInt(req.params.id));
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      
      const hasVoted = await storage.hasVoted(proposal.id, validation.data!.voterAddress);
      if (hasVoted) {
        return res.status(400).json({ message: "Already voted on this proposal" });
      }
      
      const vote = await storage.addVote(validation.data!);
      
      // Add activity for voting
      await storage.addActivity({
        groupId: proposal.groupId,
        userAddress: validation.data!.voterAddress,
        activityType: "vote_cast",
        description: `${validation.data!.voterAddress} voted ${validation.data!.vote ? "Yes" : "No"} on proposal: "${proposal.description}"`
      });
      
      res.status(201).json(vote);
    } catch (error) {
      res.status(500).json({ message: "Failed to add vote" });
    }
  });
  
  // Activity Routes
  app.get("/api/groups/:id/activities", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const activities = await storage.getGroupActivities(parseInt(req.params.id), limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to get group activities" });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
