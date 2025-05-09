import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWeb3 } from "@/hooks/use-web3";
import { useSacco } from "@/hooks/use-sacco";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, DollarSign, Clock, CheckCircle, AlertCircle, User } from "lucide-react";
import { format, isBefore, formatDistance } from "date-fns";
import LoanRequestModal from "@/components/modals/loan-request-modal";

export default function Loans() {
  const { address } = useWeb3();
  const { getUserInfo, getUserLoans, repayLoan } = useSacco();
  const [isLoanRequestModalOpen, setIsLoanRequestModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("all");
  
  const { data: userInfo } = useQuery({
    queryKey: ["/api/users", address],
    queryFn: () => getUserInfo(address || ""),
    enabled: !!address,
  });
  
  const { data: loans, isLoading: isLoadingLoans } = useQuery({
    queryKey: ["/api/users", address, "loans"],
    queryFn: () => getUserLoans(address || ""),
    enabled: !!address,
  });
  
  // Calculate borrowing limit based on user deposits and multiplier limit
  const borrowingLimit = userInfo ? userInfo.totalDeposits * 3 : 0;
  
  // Filter loans based on selected status
  const filteredLoans = loans?.filter(loan => {
    if (selectedStatus === "all") return true;
    if (selectedStatus === "active") return loan.approved && !loan.repaid && !loan.defaulted;
    if (selectedStatus === "pending") return !loan.approved && !loan.repaid && !loan.defaulted;
    if (selectedStatus === "repaid") return loan.repaid;
    if (selectedStatus === "defaulted") return loan.defaulted;
    return true;
  });
  
  // Group loans by their status for summary
  const loanSummary = {
    active: loans?.filter(loan => loan.approved && !loan.repaid && !loan.defaulted).length || 0,
    pending: loans?.filter(loan => !loan.approved && !loan.repaid && !loan.defaulted).length || 0,
    repaid: loans?.filter(loan => loan.repaid).length || 0,
    defaulted: loans?.filter(loan => loan.defaulted).length || 0,
    total: loans?.length || 0
  };
  
  // Calculate total borrowed amount and total repaid amount
  const totalBorrowed = loans?.reduce((total, loan) => {
    if (loan.approved) return total + loan.amount;
    return total;
  }, 0) || 0;
  
  const totalRepaid = loans?.reduce((total, loan) => {
    if (loan.repaid) return total + loan.amount;
    return total;
  }, 0) || 0;
  
  // Handle repayment
  const handleRepay = async (loanId: number) => {
    try {
      await repayLoan(loanId);
    } catch (error) {
      console.error("Error repaying loan:", error);
    }
  };
  
  // Render loan status badge
  const renderLoanStatus = (loan: any) => {
    if (loan.defaulted) {
      return <Badge variant="destructive">Defaulted</Badge>;
    } else if (loan.repaid) {
      return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Repaid</Badge>;
    } else if (loan.approved) {
      if (isBefore(new Date(loan.dueDate), new Date())) {
        return <Badge variant="destructive">Overdue</Badge>;
      }
      return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
    } else {
      return <Badge variant="secondary">Pending</Badge>;
    }
  };
  
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Loans</h2>
        <Button 
          onClick={() => setIsLoanRequestModalOpen(true)}
          className="mt-4 md:mt-0"
          disabled={borrowingLimit <= 0}
        >
          <DollarSign className="mr-2 h-4 w-4" />
          Request Loan
        </Button>
      </div>
      
      {/* Loan Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Borrowed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalBorrowed} USDC</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Repaid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalRepaid} USDC</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Available Limit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{borrowingLimit} USDC</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Credit Score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{userInfo?.creditScore || 0}</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Loans List */}
      <Tabs defaultValue="all" value={selectedStatus} onValueChange={setSelectedStatus}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="all">All ({loanSummary.total})</TabsTrigger>
            <TabsTrigger value="active">Active ({loanSummary.active})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({loanSummary.pending})</TabsTrigger>
            <TabsTrigger value="repaid">Repaid ({loanSummary.repaid})</TabsTrigger>
            <TabsTrigger value="defaulted">Defaulted ({loanSummary.defaulted})</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value={selectedStatus}>
          {isLoadingLoans ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredLoans && filteredLoans.length > 0 ? (
            <div className="space-y-4">
              {filteredLoans.map((loan) => (
                <Card key={loan.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between">
                      <div className="mb-4 md:mb-0">
                        <div className="flex items-center mb-2">
                          <DollarSign className="h-5 w-5 text-primary mr-2" />
                          <h3 className="text-lg font-semibold">{loan.amount} USDC</h3>
                          <div className="ml-3">{renderLoanStatus(loan)}</div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span>Due: {loan.dueDate ? format(new Date(loan.dueDate), 'MMM dd, yyyy') : 'N/A'}</span>
                          </div>
                          
                          {!loan.repaid && !loan.defaulted && loan.dueDate && (
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-2" />
                              <span>
                                {isBefore(new Date(loan.dueDate), new Date())
                                  ? `Overdue by ${formatDistance(new Date(loan.dueDate), new Date())}`
                                  : `${formatDistance(new Date(), new Date(loan.dueDate))} remaining`}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2" />
                            <span>{loan.guarantors?.length || 0} Guarantors</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        {loan.approved && !loan.repaid && !loan.defaulted && (
                          <Button onClick={() => handleRepay(loan.id)}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Repay Loan
                          </Button>
                        )}
                        
                        <Button variant="outline">
                          Details
                        </Button>
                      </div>
                    </div>
                    
                    {/* Guarantors */}
                    {loan.guarantors && loan.guarantors.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <h4 className="text-sm font-medium mb-2">Guarantors:</h4>
                        <div className="flex flex-wrap gap-2">
                          {loan.guarantors.map((guarantor: any, index: number) => (
                            <div key={index} className="flex items-center text-xs bg-gray-100 rounded-full px-3 py-1">
                              <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center mr-1 text-[10px]">
                                {guarantor.guarantorAddress.slice(2, 4).toUpperCase()}
                              </span>
                              <span className="text-gray-700">
                                {guarantor.guarantorAddress.slice(0, 6)}...{guarantor.guarantorAddress.slice(-4)}
                              </span>
                              {guarantor.approved ? (
                                <CheckCircle className="ml-1 h-3 w-3 text-green-500" />
                              ) : (
                                <AlertCircle className="ml-1 h-3 w-3 text-yellow-500" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">No loans found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedStatus === "all" 
                    ? "You haven't requested any loans yet."
                    : `You don't have any ${selectedStatus} loans.`}
                </p>
                {selectedStatus === "all" && (
                  <Button className="mt-4" onClick={() => setIsLoanRequestModalOpen(true)}>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Request a Loan
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Loan Request Modal */}
      <LoanRequestModal 
        isOpen={isLoanRequestModalOpen} 
        onClose={() => setIsLoanRequestModalOpen(false)} 
        maxAmount={borrowingLimit}
        groupId={userInfo?.groupId}
      />
    </div>
  );
}
