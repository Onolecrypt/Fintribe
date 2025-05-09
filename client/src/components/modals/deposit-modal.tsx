import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWeb3 } from "@/hooks/use-web3";
import { useSacco } from "@/hooks/use-sacco";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const [amount, setAmount] = useState("");
  const { address } = useWeb3();
  const { getUserBalance, deposit } = useSacco();
  const { toast } = useToast();

  // Get user's token balance
  const { data: balance, isLoading: isLoadingBalance } = useQuery({
    queryKey: ["/api/users", address, "balance"],
    queryFn: () => getUserBalance(),
    enabled: isOpen && !!address,
  });

  // Deposit mutation
  const depositMutation = useMutation({
    mutationFn: async (amount: number) => {
      return deposit(amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", address] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", address, "balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", address, "group"] });
      toast({
        title: "Success",
        description: `Successfully deposited ${amount} USDC`,
      });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to make deposit",
        variant: "destructive"
      });
    }
  });

  const handleDeposit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to deposit",
        variant: "destructive"
      });
      return;
    }

    const depositAmount = Number(amount);
    
    // Check if user has enough balance
    if (balance && depositAmount > balance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough USDC to make this deposit",
        variant: "destructive"
      });
      return;
    }

    depositMutation.mutate(depositAmount);
  };

  const handleClose = () => {
    setAmount("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
          <DialogDescription>
            Deposit stablecoins into your SaccoDAO account. The funds will be added to your group's total deposits.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount (USDC)</Label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pr-12"
                  min="0"
                  step="0.01"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">USDC</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500">
                Your balance: <span className="font-medium">
                  {isLoadingBalance ? "Loading..." : `${balance || 0} USDC`}
                </span>
              </p>
            </div>
          </div>
        </div>
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeposit} 
            disabled={depositMutation.isPending || !amount || Number(amount) <= 0}
          >
            {depositMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Depositing...
              </>
            ) : (
              "Deposit"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
