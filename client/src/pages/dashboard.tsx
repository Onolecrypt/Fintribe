import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useWeb3 } from "@/hooks/use-web3";
import { useSacco } from "@/hooks/use-sacco";
import SummaryCard from "@/components/summary-card";
import LoansTable from "@/components/loans-table";
import GroupActivity from "@/components/group-activity";
import GuarantorRequests from "@/components/guarantor-requests";
import ProposalsTable from "@/components/proposals-table";
import DepositModal from "@/components/modals/deposit-modal";
import LoanRequestModal from "@/components/modals/loan-request-modal";

import { Wallet, DollarSign, Percent } from "lucide-react";

export default function Dashboard() {
  const { address } = useWeb3();
  const { getUserInfo, getGroupInfo, getActiveLoans, calculateUserInterest } = useSacco();
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isLoanRequestModalOpen, setIsLoanRequestModalOpen] = useState(false);

  const { data: userInfo, isLoading: isLoadingUser } = useQuery({
    queryKey: ["/api/users", address],
    queryFn: () => getUserInfo(address || ""),
    enabled: !!address,
  });

  const { data: groupInfo, isLoading: isLoadingGroup } = useQuery({
    queryKey: ["/api/users", address, "group"],
    queryFn: () => getGroupInfo(address || ""),
    enabled: !!address && !!userInfo?.groupId,
  });

  const { data: activeLoans, isLoading: isLoadingLoans } = useQuery({
    queryKey: ["/api/users", address, "loans"],
    queryFn: () => getActiveLoans(address || ""),
    enabled: !!address,
  });

  const { data: earnedInterest } = useQuery({
    queryKey: ["/api/users", address, "interest"],
    queryFn: () => calculateUserInterest(address || ""),
    enabled: !!address && !!userInfo,
  });

  // Calculate borrowing limit based on user deposits and multiplier limit
  const borrowingLimit = userInfo ? userInfo.totalDeposits * 3 : 0;

  return (
    <>
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Dashboard</h2>
        <div className="mt-4 md:mt-0 flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
          <button
            onClick={() => setIsDepositModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Wallet className="mr-2 h-4 w-4" />
            Deposit Funds
          </button>
          <button
            onClick={() => setIsLoanRequestModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-secondary hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Request Loan
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <SummaryCard
          title="Total Deposits"
          value={`${userInfo?.totalDeposits || 0} USDC`}
          icon={<Wallet className="text-blue-600" />}
          iconBgColor="bg-blue-100"
          linkText="View transaction history"
          linkHref="/transactions"
          isLoading={isLoadingUser}
        />

        <SummaryCard
          title="Available Borrowing Limit"
          value={`${borrowingLimit} USDC`}
          icon={<DollarSign className="text-green-600" />}
          iconBgColor="bg-green-100"
          linkText="Apply for loan"
          linkHref="#"
          isLoading={isLoadingUser}
          onClick={() => setIsLoanRequestModalOpen(true)}
        />

        <SummaryCard
          title="Earned Interest"
          value={`${earnedInterest || 0} USDC`}
          icon={<Percent className="text-purple-600" />}
          iconBgColor="bg-purple-100"
          linkText="Withdraw interest"
          linkHref="#"
          isLoading={isLoadingUser}
          extraContent={
            <p className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
              <span className="sr-only">Interest rate:</span>
              3% APY
            </p>
          }
        />
      </div>

      {/* Active Loans */}
      <h3 className="text-lg font-medium text-gray-900 mb-3">Active Loans</h3>
      <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
        <LoansTable loans={activeLoans || []} isLoading={isLoadingLoans} />
      </div>

      {/* Group Activity and Guarantor Requests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GroupActivity groupId={userInfo?.groupId} />
        <GuarantorRequests address={address || ""} />
      </div>

      {/* Active Proposals Section */}
      <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">Active Proposals</h3>
      <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
        <ProposalsTable groupId={userInfo?.groupId} />
      </div>

      {/* Modals */}
      <DepositModal 
        isOpen={isDepositModalOpen} 
        onClose={() => setIsDepositModalOpen(false)} 
      />
      
      <LoanRequestModal 
        isOpen={isLoanRequestModalOpen} 
        onClose={() => setIsLoanRequestModalOpen(false)} 
        maxAmount={borrowingLimit}
        groupId={userInfo?.groupId}
      />
    </>
  );
}
