import { format, formatDistance, isBefore } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSacco } from "@/hooks/use-sacco";
import { useToast } from "@/hooks/use-toast";

interface Guarantor {
  id: number;
  loanId: number;
  guarantorAddress: string;
  approved: boolean;
}

interface Loan {
  id: number;
  borrowerAddress: string;
  amount: number;
  dueDate: string;
  repaid: boolean;
  approved: boolean;
  defaulted: boolean;
  createdAt: string;
  guarantors?: Guarantor[];
}

interface LoansTableProps {
  loans: Loan[];
  isLoading?: boolean;
}

export default function LoansTable({ loans, isLoading = false }: LoansTableProps) {
  const { repayLoan } = useSacco();
  const { toast } = useToast();

  const handleRepay = async (loanId: number) => {
    try {
      await repayLoan(loanId);
      toast({
        title: "Success",
        description: "Loan repaid successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to repay loan",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (loan: Loan) => {
    if (loan.defaulted) {
      return <Badge variant="destructive">Defaulted</Badge>;
    } else if (loan.repaid) {
      return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Repaid</Badge>;
    } else if (loan.approved) {
      if (loan.dueDate && isBefore(new Date(loan.dueDate), new Date())) {
        return <Badge variant="destructive">Overdue</Badge>;
      }
      return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
    } else {
      return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getTimeRemaining = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    
    if (isBefore(due, now)) {
      return `Overdue by ${formatDistance(due, now)}`;
    }
    
    return `${formatDistance(now, due)} remaining`;
  };

  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guarantors</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[1, 2, 3].map((i) => (
              <tr key={i}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Skeleton className="h-5 w-24" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-4 w-20" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Skeleton className="h-6 w-32" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <Skeleton className="h-9 w-32 ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guarantors</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {loans.length > 0 ? (
            loans.map((loan) => (
              <tr key={loan.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{loan.amount} USDC</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {loan.dueDate ? format(new Date(loan.dueDate), "MMM d, yyyy") : "N/A"}
                  </div>
                  {!loan.repaid && !loan.defaulted && loan.dueDate && (
                    <div className="text-sm text-gray-500">
                      {getTimeRemaining(loan.dueDate)}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(loan)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex -space-x-1 overflow-hidden">
                    {loan.guarantors && loan.guarantors.length > 0 ? (
                      loan.guarantors.map((guarantor, idx) => (
                        <span
                          key={idx}
                          className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-gray-200 text-xs flex items-center justify-center"
                          title={guarantor.guarantorAddress}
                        >
                          {guarantor.guarantorAddress.slice(2, 4).toUpperCase()}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">None</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {loan.approved && !loan.repaid && !loan.defaulted ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleRepay(loan.id)}
                      className="text-green-600 hover:text-green-900 border-green-200 mr-2"
                    >
                      Repay
                    </Button>
                  ) : null}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-blue-600 hover:text-blue-900"
                    onClick={() => {
                      toast({
                        title: "Loan Details",
                        description: `Viewing details for loan #${loan.id}`,
                      });
                    }}
                  >
                    Details
                  </Button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                You have no active loans
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
