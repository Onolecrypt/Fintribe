import { useQuery, useMutation } from "@tanstack/react-query";
import { useSacco } from "@/hooks/use-sacco";
import { useWeb3 } from "@/hooks/use-web3";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistance, isAfter } from "date-fns";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface ProposalsTableProps {
  groupId?: number;
}

export default function ProposalsTable({ groupId }: ProposalsTableProps) {
  const { address } = useWeb3();
  const { getGroupProposals, voteOnProposal, checkIfUserHasVoted } = useSacco();
  const { toast } = useToast();
  
  const { data: proposals, isLoading } = useQuery({
    queryKey: ["/api/groups", groupId, "proposals"],
    queryFn: () => getGroupProposals(groupId || 0),
    enabled: !!groupId,
  });

  // Filter to only get active proposals (not executed and deadline in the future)
  const activeProposals = proposals?.filter(p => 
    !p.executed && isAfter(new Date(p.deadline), new Date())
  ) || [];

  // Vote mutation
  const vote = useMutation({
    mutationFn: async ({ proposalId, voteValue }: { proposalId: number, voteValue: boolean }) => {
      return voteOnProposal(proposalId, voteValue);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "proposals"] });
      toast({
        title: "Success",
        description: "Your vote has been recorded",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to record vote",
        variant: "destructive",
      });
    }
  });

  // Handle vote
  const handleVote = async (proposalId: number, voteValue: boolean) => {
    try {
      // Check if user has already voted
      const hasVoted = await checkIfUserHasVoted(proposalId);
      if (hasVoted) {
        toast({
          title: "Already Voted",
          description: "You have already voted on this proposal",
        });
        return;
      }
      
      vote.mutate({ proposalId, voteValue });
    } catch (error) {
      console.error("Error checking vote status:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Votes</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deadline</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[1, 2, 3].map((i) => (
              <tr key={i}>
                <td className="px-6 py-4">
                  <Skeleton className="h-5 w-full" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Skeleton className="h-5 w-full mb-2" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Skeleton className="h-6 w-20 rounded-full" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    <Skeleton className="h-8 w-20 rounded-full" />
                    <Skeleton className="h-8 w-20 rounded-full" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!groupId) {
    return (
      <div className="p-8 text-center text-sm text-gray-500">
        Join a group to view proposals
      </div>
    );
  }

  if (activeProposals.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-gray-500">
        No active proposals at the moment
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Votes</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deadline</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {activeProposals.map((proposal) => {
            const totalVotes = proposal.votesYes + proposal.votesNo;
            const yesPercentage = totalVotes > 0 ? Math.round((proposal.votesYes / totalVotes) * 100) : 0;
            
            return (
              <tr key={proposal.id}>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{proposal.description}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-green-700">{proposal.votesYes} Yes</div>
                    <span className="mx-2 text-gray-500">|</span>
                    <div className="text-sm font-medium text-red-700">{proposal.votesNo} No</div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${yesPercentage}%` }}
                    ></div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {format(new Date(proposal.deadline), "MMM d, yyyy")}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDistance(new Date(), new Date(proposal.deadline), { addSuffix: false })} remaining
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                    In Progress
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200 mr-2"
                    onClick={() => handleVote(proposal.id, true)}
                    disabled={vote.isPending}
                  >
                    <ThumbsUp className="h-3 w-3 mr-1" /> Vote Yes
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200"
                    onClick={() => handleVote(proposal.id, false)}
                    disabled={vote.isPending}
                  >
                    <ThumbsDown className="h-3 w-3 mr-1" /> Vote No
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
