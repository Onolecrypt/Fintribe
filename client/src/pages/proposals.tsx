import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useWeb3 } from "@/hooks/use-web3";
import { useSacco } from "@/hooks/use-sacco";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format, formatDistance, isAfter } from "date-fns";
import { Landmark, Clock, CheckCircle, XCircle, ThumbsUp, ThumbsDown, Plus, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Proposals() {
  const { address } = useWeb3();
  const { getUserInfo, getGroupProposals, executeProposal, voteOnProposal } = useSacco();
  const { toast } = useToast();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [proposalDescription, setProposalDescription] = useState("");
  const [proposalDays, setProposalDays] = useState("3");
  
  const { data: userInfo } = useQuery({
    queryKey: ["/api/users", address],
    queryFn: () => getUserInfo(address || ""),
    enabled: !!address,
  });
  
  const { data: proposals, isLoading: isLoadingProposals } = useQuery({
    queryKey: ["/api/groups", userInfo?.groupId, "proposals"],
    queryFn: () => getGroupProposals(userInfo?.groupId || 0),
    enabled: !!userInfo?.groupId,
  });
  
  // Create proposal mutation
  const createProposal = useMutation({
    mutationFn: async (data: { description: string, deadline: Date }) => {
      const res = await apiRequest("POST", "/api/proposals", {
        groupId: userInfo?.groupId,
        description: data.description,
        deadline: data.deadline.toISOString(),
        creatorAddress: address
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", userInfo?.groupId, "proposals"] });
      setCreateModalOpen(false);
      setProposalDescription("");
      setProposalDays("3");
      toast({
        title: "Success",
        description: "Proposal created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create proposal: ${error}`,
        variant: "destructive",
      });
    }
  });
  
  // Vote on proposal mutation
  const vote = useMutation({
    mutationFn: async ({ proposalId, vote }: { proposalId: number, vote: boolean }) => {
      return voteOnProposal(proposalId, vote);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", userInfo?.groupId, "proposals"] });
      toast({
        title: "Success",
        description: "Your vote has been recorded",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to cast vote: ${error}`,
        variant: "destructive",
      });
    }
  });
  
  // Execute proposal mutation
  const execute = useMutation({
    mutationFn: async (proposalId: number) => {
      return executeProposal(proposalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", userInfo?.groupId, "proposals"] });
      toast({
        title: "Success",
        description: "Proposal executed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to execute proposal: ${error}`,
        variant: "destructive",
      });
    }
  });
  
  const handleCreateProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (proposalDescription.trim()) {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + parseInt(proposalDays));
      createProposal.mutate({ description: proposalDescription, deadline });
    }
  };
  
  const handleVote = (proposalId: number, voteValue: boolean) => {
    vote.mutate({ proposalId, vote: voteValue });
  };
  
  const handleExecute = (proposalId: number) => {
    execute.mutate(proposalId);
  };
  
  // Filter proposals
  const activeProposals = proposals?.filter(p => !p.executed && isAfter(new Date(p.deadline), new Date())) || [];
  const completedProposals = proposals?.filter(p => p.executed || !isAfter(new Date(p.deadline), new Date())) || [];
  
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Proposals</h2>
        <Button 
          onClick={() => setCreateModalOpen(true)}
          className="mt-4 md:mt-0"
          disabled={!userInfo?.groupId}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Proposal
        </Button>
      </div>
      
      {!userInfo?.groupId ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Landmark className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No Group Joined</h3>
            <p className="mt-1 text-sm text-gray-500">
              You need to join a group to create and vote on proposals
            </p>
            <Button className="mt-4" onClick={() => window.location.href = "/groups"}>
              Join a Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="active">
          <TabsList className="mb-4">
            <TabsTrigger value="active">
              Active Proposals {activeProposals.length ? `(${activeProposals.length})` : ''}
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed Proposals {completedProposals.length ? `(${completedProposals.length})` : ''}
            </TabsTrigger>
          </TabsList>
          
          {/* Active Proposals */}
          <TabsContent value="active">
            {isLoadingProposals ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
                      <div className="h-2 bg-gray-200 rounded w-full"></div>
                    </CardContent>
                    <CardFooter>
                      <div className="h-10 bg-gray-200 rounded w-full"></div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : activeProposals.length > 0 ? (
              <div className="space-y-4">
                {activeProposals.map((proposal) => {
                  const totalVotes = proposal.votesYes + proposal.votesNo;
                  const yesPercentage = totalVotes > 0 ? (proposal.votesYes / totalVotes) * 100 : 0;
                  
                  return (
                    <Card key={proposal.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="flex items-center">
                              <Landmark className="mr-2 h-5 w-5 text-primary" />
                              Proposal #{proposal.id}
                            </CardTitle>
                            <CardDescription>
                              Created on {format(new Date(proposal.createdAt), 'MMM d, yyyy')}
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                            Active
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 mb-4">{proposal.description}</p>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-green-600 font-medium">{proposal.votesYes} Yes</span>
                            <span className="text-red-600 font-medium">{proposal.votesNo} No</span>
                          </div>
                          <Progress value={yesPercentage} className="h-2" />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{Math.round(yesPercentage)}%</span>
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDistance(new Date(), new Date(proposal.deadline), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
                          onClick={() => handleVote(proposal.id, false)}
                          disabled={vote.isPending}
                        >
                          <ThumbsDown className="mr-1 h-4 w-4" />
                          Vote No
                        </Button>
                        <Button 
                          variant="outline"
                          size="sm"
                          className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                          onClick={() => handleVote(proposal.id, true)}
                          disabled={vote.isPending}
                        >
                          <ThumbsUp className="mr-1 h-4 w-4" />
                          Vote Yes
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Landmark className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No active proposals</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    There are no active proposals in your group at the moment
                  </p>
                  <Button className="mt-4" onClick={() => setCreateModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Proposal
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Completed Proposals */}
          <TabsContent value="completed">
            {isLoadingProposals ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
                      <div className="h-2 bg-gray-200 rounded w-full"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : completedProposals.length > 0 ? (
              <div className="space-y-4">
                {completedProposals.map((proposal) => {
                  const totalVotes = proposal.votesYes + proposal.votesNo;
                  const yesPercentage = totalVotes > 0 ? (proposal.votesYes / totalVotes) * 100 : 0;
                  const isApproved = proposal.votesYes > proposal.votesNo;
                  const isExpired = !isAfter(new Date(proposal.deadline), new Date());
                  
                  return (
                    <Card key={proposal.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="flex items-center">
                              <Landmark className="mr-2 h-5 w-5 text-gray-500" />
                              Proposal #{proposal.id}
                            </CardTitle>
                            <CardDescription>
                              Created on {format(new Date(proposal.createdAt), 'MMM d, yyyy')}
                            </CardDescription>
                          </div>
                          {proposal.executed ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                              Executed
                            </Badge>
                          ) : isExpired ? (
                            <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                              Expired
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                              Completed
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 mb-4">{proposal.description}</p>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-green-600 font-medium">{proposal.votesYes} Yes</span>
                            <span className="text-red-600 font-medium">{proposal.votesNo} No</span>
                          </div>
                          <Progress value={yesPercentage} className="h-2" />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>
                              {isApproved ? (
                                <span className="text-green-600 flex items-center">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Approved
                                </span>
                              ) : (
                                <span className="text-red-600 flex items-center">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Rejected
                                </span>
                              )}
                            </span>
                            <span>
                              Ended {formatDistance(new Date(proposal.deadline), new Date(), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        
                        {isExpired && isApproved && !proposal.executed && (
                          <div className="mt-4 flex justify-end">
                            <Button 
                              size="sm"
                              onClick={() => handleExecute(proposal.id)}
                              disabled={execute.isPending}
                            >
                              {execute.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="mr-2 h-4 w-4" />
                              )}
                              Execute Proposal
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Landmark className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No completed proposals</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    There are no completed proposals in your group
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
      
      {/* Create Proposal Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Proposal</DialogTitle>
            <DialogDescription>
              Create a new proposal for your group members to vote on.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProposal}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="description">Proposal Description</Label>
                <Textarea
                  id="description"
                  value={proposalDescription}
                  onChange={(e) => setProposalDescription(e.target.value)}
                  placeholder="Describe your proposal"
                  rows={5}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="duration">Voting Duration (Days)</Label>
                <select
                  id="duration"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={proposalDays}
                  onChange={(e) => setProposalDays(e.target.value)}
                  required
                >
                  <option value="1">1 day</option>
                  <option value="2">2 days</option>
                  <option value="3">3 days</option>
                  <option value="5">5 days</option>
                  <option value="7">7 days</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createProposal.isPending || !proposalDescription.trim()}>
                {createProposal.isPending ? "Creating..." : "Create Proposal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
