import { useQuery, useMutation } from "@tanstack/react-query";
import { useWeb3 } from "@/hooks/use-web3";
import { useSacco } from "@/hooks/use-sacco";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { DollarSign, Clock, ClipboardCheck, AlertCircle, Shield } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Guarantor() {
  const { address } = useWeb3();
  const { getUserInfo, getGuarantorRequests, getGuarantorHistory } = useSacco();
  const { toast } = useToast();
  
  const { data: userInfo } = useQuery({
    queryKey: ["/api/users", address],
    queryFn: () => getUserInfo(address || ""),
    enabled: !!address,
  });
  
  const { data: pendingRequests, isLoading: isLoadingPending } = useQuery({
    queryKey: ["/api/guarantor", address, "pending"],
    queryFn: () => getGuarantorRequests(address || "", false),
    enabled: !!address && !!userInfo,
  });
  
  const { data: approvedRequests, isLoading: isLoadingApproved } = useQuery({
    queryKey: ["/api/guarantor", address, "approved"],
    queryFn: () => getGuarantorHistory(address || ""),
    enabled: !!address && !!userInfo,
  });
  
  // Approve guarantor request mutation
  const approveRequest = useMutation({
    mutationFn: async ({ loanId, approve }: { loanId: number, approve: boolean }) => {
      const res = await apiRequest("PATCH", `/api/loans/${loanId}/guarantors/${address}`, {
        approved: approve
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guarantor", address, "pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guarantor", address, "approved"] });
      
      toast({
        title: "Success",
        description: "Your response has been recorded",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to process request: ${error}`,
        variant: "destructive",
      });
    }
  });
  
  const handleApprove = (loanId: number) => {
    approveRequest.mutate({ loanId, approve: true });
  };
  
  const handleDecline = (loanId: number) => {
    approveRequest.mutate({ loanId, approve: false });
  };
  
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Guarantor Requests</h2>
        <p className="text-gray-500 mt-1">Manage loan guarantee requests from your group members</p>
      </div>
      
      {/* Tabs */}
      <Tabs defaultValue="pending">
        <TabsList className="mb-4">
          <TabsTrigger value="pending">
            Pending Requests {pendingRequests?.length ? `(${pendingRequests.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="history">
            History
          </TabsTrigger>
        </TabsList>
        
        {/* Pending Requests */}
        <TabsContent value="pending">
          {isLoadingPending ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </CardContent>
                  <CardFooter>
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : pendingRequests && pendingRequests.length > 0 ? (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center">
                          <Shield className="mr-2 h-5 w-5 text-primary" />
                          Loan Request
                        </CardTitle>
                        <CardDescription>
                          From: {request.borrowerAddress.slice(0, 6)}...{request.borrowerAddress.slice(-4)}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                        Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Loan Amount</p>
                        <p className="font-semibold flex items-center">
                          <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                          {request.amount} USDC
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Duration</p>
                        <p className="font-semibold flex items-center">
                          <Clock className="h-4 w-4 mr-1 text-gray-400" />
                          {request.dueDate && new Date(request.dueDate) > new Date() ? 
                            `${Math.ceil((new Date(request.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days` : 
                            'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Request Date</p>
                        <p className="font-semibold flex items-center">
                          <ClipboardCheck className="h-4 w-4 mr-1 text-gray-400" />
                          {request.createdAt ? format(new Date(request.createdAt), 'MMM d, yyyy') : 'N/A'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <h4 className="text-sm font-medium mb-2">Other Guarantors:</h4>
                      <div className="flex flex-wrap gap-2">
                        {request.guarantors.filter((g: any) => g.guarantorAddress !== address).map((guarantor: any, index: number) => (
                          <div key={index} className="flex items-center text-xs bg-gray-100 rounded-full px-3 py-1">
                            <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center mr-1 text-[10px]">
                              {guarantor.guarantorAddress.slice(2, 4).toUpperCase()}
                            </span>
                            <span className="text-gray-700">
                              {guarantor.guarantorAddress.slice(0, 6)}...{guarantor.guarantorAddress.slice(-4)}
                            </span>
                            {guarantor.approved ? (
                              <Badge variant="outline" className="ml-1 h-4 bg-green-100 text-green-800 hover:bg-green-100">
                                Approved
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="ml-1 h-4 bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                Pending
                              </Badge>
                            )}
                          </div>
                        ))}
                        {request.guarantors.filter((g: any) => g.guarantorAddress !== address).length === 0 && (
                          <span className="text-xs text-gray-500">No other guarantors</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => handleDecline(request.id)} disabled={approveRequest.isPending}>
                      Decline
                    </Button>
                    <Button onClick={() => handleApprove(request.id)} disabled={approveRequest.isPending}>
                      Approve
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Shield className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">No pending requests</h3>
                <p className="mt-1 text-sm text-gray-500">
                  You don't have any pending guarantor requests at the moment
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* History */}
        <TabsContent value="history">
          {isLoadingApproved ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : approvedRequests && approvedRequests.length > 0 ? (
            <div className="space-y-4">
              {approvedRequests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center">
                          <Shield className="mr-2 h-5 w-5 text-primary" />
                          Loan Guarantee
                        </CardTitle>
                        <CardDescription>
                          For: {request.borrowerAddress.slice(0, 6)}...{request.borrowerAddress.slice(-4)}
                        </CardDescription>
                      </div>
                      <div>
                        {request.repaid ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                            Repaid
                          </Badge>
                        ) : request.defaulted ? (
                          <Badge variant="destructive">
                            Defaulted
                          </Badge>
                        ) : request.approved ? (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Loan Amount</p>
                        <p className="font-semibold flex items-center">
                          <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                          {request.amount} USDC
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Due Date</p>
                        <p className="font-semibold flex items-center">
                          <Clock className="h-4 w-4 mr-1 text-gray-400" />
                          {request.dueDate ? format(new Date(request.dueDate), 'MMM d, yyyy') : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Your Response</p>
                        <p className="font-semibold flex items-center">
                          {request.guarantors.find((g: any) => g.guarantorAddress === address)?.approved ? (
                            <span className="text-green-600 flex items-center">
                              <ClipboardCheck className="h-4 w-4 mr-1" />
                              Approved
                            </span>
                          ) : (
                            <span className="text-red-600 flex items-center">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              Declined
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <ClipboardCheck className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">No history found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  You haven't responded to any guarantor requests yet
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
