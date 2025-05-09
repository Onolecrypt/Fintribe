import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  address: varchar("address", { length: 42 }).notNull().unique(),
  groupId: integer("group_id"),
  totalDeposits: integer("total_deposits").default(0),
  creditScore: integer("credit_score").default(100),
  lastDepositTime: timestamp("last_deposit_time").defaultNow(),
  registered: boolean("registered").default(false),
  isDefaulted: boolean("is_defaulted").default(false),
});

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  admin: varchar("admin", { length: 42 }).notNull(),
  totalDeposits: integer("total_deposits").default(0),
  totalLoaned: integer("total_loaned").default(0),
});

export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  memberAddress: varchar("member_address", { length: 42 }).notNull(),
});

export const loans = pgTable("loans", {
  id: serial("id").primaryKey(),
  borrowerAddress: varchar("borrower_address", { length: 42 }).notNull(),
  amount: integer("amount").notNull(),
  dueDate: timestamp("due_date").notNull(),
  repaid: boolean("repaid").default(false),
  approved: boolean("approved").default(false),
  defaulted: boolean("defaulted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const guarantors = pgTable("guarantors", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id").notNull(),
  guarantorAddress: varchar("guarantor_address", { length: 42 }).notNull(),
  approved: boolean("approved").default(false),
});

export const proposals = pgTable("proposals", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  description: text("description").notNull(),
  votesYes: integer("votes_yes").default(0),
  votesNo: integer("votes_no").default(0),
  deadline: timestamp("deadline").notNull(),
  executed: boolean("executed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  proposalId: integer("proposal_id").notNull(),
  voterAddress: varchar("voter_address", { length: 42 }).notNull(),
  vote: boolean("vote").notNull(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  userAddress: varchar("user_address", { length: 42 }).notNull(),
  activityType: varchar("activity_type", { length: 50 }).notNull(),
  description: text("description").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true
});

export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  totalDeposits: true,
  totalLoaned: true
});

export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({
  id: true
});

export const insertLoanSchema = createInsertSchema(loans).omit({
  id: true,
  createdAt: true
});

export const insertGuarantorSchema = createInsertSchema(guarantors).omit({
  id: true
});

export const insertProposalSchema = createInsertSchema(proposals).omit({
  id: true,
  votesYes: true,
  votesNo: true,
  executed: true,
  createdAt: true
});

export const insertVoteSchema = createInsertSchema(votes).omit({
  id: true
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  timestamp: true
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;

export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;

export type Loan = typeof loans.$inferSelect;
export type InsertLoan = z.infer<typeof insertLoanSchema>;

export type Guarantor = typeof guarantors.$inferSelect;
export type InsertGuarantor = z.infer<typeof insertGuarantorSchema>;

export type Proposal = typeof proposals.$inferSelect;
export type InsertProposal = z.infer<typeof insertProposalSchema>;

export type Vote = typeof votes.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
