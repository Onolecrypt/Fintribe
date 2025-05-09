import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSacco } from "@/hooks/use-sacco";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

interface GuarantorRequestsProps {
  address: string;
}

export default function GuarantorRequests({ address }: GuarantorRequestsProps) {
  const { getGuarantorRequests, approveGuarantorRequest } = useSacco();
  const { toast } = useToast();
  
  const { data: requests, isLoading } = useQuery({
    queryKey: ["/api/guarantor", address, "pending"],
    queryFn: () => getGuarantorRequests(address, false),
    enabled: !!address,
  });

  // Approve guarantor request mutation
  const approveRequest = useMutation({
    mutationFn: async ({ loanId, approve }: { loanId: number, approve: boolean }) => {
      return approveGuarantorRequest(loanId, approve);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guarantor", address, "pending"] });
      
      toast({
        title: "Success",
        description: "Your response has been recorded",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process request",
        variant: "destructive",
      });
    }
  });

  // Handle approve or decline
  const handleResponse = (loanId: number, approve: boolean) => {
    approveRequest.mutate({ loanId, approve });
  };

  const formatTimeAgo = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return "recently";
    }
  };

  const formatUserAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Card>
      <CardHeader className="px-4 py-4 border-b border-gray-200">
        <h3 className="text-base font-medium text-gray-900">Pending Guarantor Requests</h3>
      </CardHeader>
      <CardContent className="px-4 py-5">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-gray-50 p-4 rounded-lg animate-pulse">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="ml-3">
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <div className="mb-3">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="flex space-x-2">
                  <Skeleton className="h-10 w-full rounded-md" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : requests && requests.length > 0 ? (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                        {request.borrowerAddress.slice(2, 4).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {formatUserAddress(request.borrowerAddress)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Requested {request.createdAt ? formatTimeAgo(request.createdAt) : "recently"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                    Pending
                  </Badge>
                </div>
                <div className="mb-3">
                  <p className="text-sm text-gray-700">Loan Amount: <span className="font-medium">{request.amount} USDC</span></p>
                  <p className="text-sm text-gray-700">Duration: <span className="font-medium">
                    {request.dueDate ? formatDistanceToNow(new Date(request.dueDate), { addSuffix: false }) : "Unknown"}
                  </span></p>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="default" 
                    className="flex-1 bg-secondary text-white" 
                    onClick={() => handleResponse(request.id, true)}
                    disabled={approveRequest.isPending}
                  >
                    Approve
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1" 
                    onClick={() => handleResponse(request.id, false)}
                    disabled={approveRequest.isPending}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-gray-500">
            No pending guarantor requests
          </div>
        )}
      </CardContent>
      <CardFooter className="px-4 py-4 bg-gray-50">
        <Link href="/guarantor">
          <a className="text-sm font-medium text-primary hover:text-blue-700">
            View guarantor history <span aria-hidden="true">&rarr;</span>
          </a>
        </Link>
      </CardFooter>
    </Card>
  );
}
