import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWeb3 } from "@/hooks/use-web3";
import { useSacco } from "@/hooks/use-sacco";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

interface LoanRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  maxAmount: number;
  groupId?: number;
}

export default function LoanRequestModal({ 
  isOpen, 
  onClose, 
  maxAmount = 0,
  groupId
}: LoanRequestModalProps) {
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("30");
  const [selectedGuarantors, setSelectedGuarantors] = useState<string[]>([]);
  
  const { address } = useWeb3();
  const { getGroupMembers, requestLoan } = useSacco();
  const { toast } = useToast();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setAmount("");
      setDuration("30");
      setSelectedGuarantors([]);
    }
  }, [isOpen]);

  // Get group members
  const { data: members, isLoading: isLoadingMembers } = useQuery({
    queryKey: ["/api/groups", groupId, "members"],
    queryFn: () => getGroupMembers(groupId || 0),
    enabled: isOpen && !!groupId,
  });

  // Filter out the current user from potential guarantors
  const potentialGuarantors = members?.filter(member => 
    member.address !== address && !member.isDefaulted
  ) || [];

  // Request loan mutation
  const loanRequestMutation = useMutation({
    mutationFn: async ({ 
      amount, 
      durationDays,
      guarantors 
    }: { 
      amount: number; 
      durationDays: number;
      guarantors: string[] 
    }) => {
      return requestLoan(amount, durationDays, guarantors);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", address, "loans"] });
      toast({
        title: "Success",
        description: "Loan request submitted successfully",
      });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit loan request",
        variant: "destructive"
      });
    }
  });

  const handleGuarantorChange = (checked: boolean, guarantorAddress: string) => {
    if (checked) {
      setSelectedGuarantors(prev => [...prev, guarantorAddress]);
    } else {
      setSelectedGuarantors(prev => prev.filter(g => g !== guarantorAddress));
    }
  };

  const handleSubmit = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid loan amount",
        variant: "destructive"
      });
      return;
    }

    const loanAmount = Number(amount);
    
    if (loanAmount > maxAmount) {
      toast({
        title: "Exceeds Limit",
        description: `Loan amount exceeds your maximum borrowing limit of ${maxAmount} USDC`,
        variant: "destructive"
      });
      return;
    }

    if (selectedGuarantors.length < 2) {
      toast({
        title: "Insufficient Guarantors",
        description: "Please select at least 2 guarantors",
        variant: "destructive"
      });
      return;
    }

    loanRequestMutation.mutate({
      amount: loanAmount,
      durationDays: Number(duration),
      guarantors: selectedGuarantors
    });
  };

  const handleClose = () => {
    onClose();
  };

  const formatUserAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request a Loan</DialogTitle>
          <DialogDescription>
            You can request up to 3x your deposit amount. Select guarantors from your group to approve your loan.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="loan-amount">Loan Amount (USDC)</Label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <Input
                  id="loan-amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pr-12"
                  min="0"
                  max={maxAmount.toString()}
                  step="0.01"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">USDC</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Maximum available: <span className="font-medium">{maxAmount} USDC</span>
              </p>
            </div>
            
            <div>
              <Label htmlFor="duration">Duration (Days)</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger id="duration">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="guarantors" className="block text-sm font-medium">Select Guarantors</Label>
              <div className="mt-1 border border-gray-300 rounded-md p-2 max-h-36 overflow-y-auto">
                {isLoadingMembers ? (
                  <div className="py-2 px-2 text-sm text-gray-500">Loading members...</div>
                ) : potentialGuarantors.length === 0 ? (
                  <div className="py-2 px-2 text-sm text-gray-500">
                    No eligible guarantors available in your group
                  </div>
                ) : (
                  <div className="space-y-2">
                    {potentialGuarantors.map((member) => (
                      <div key={member.address} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`guarantor-${member.address}`}
                          checked={selectedGuarantors.includes(member.address)}
                          onCheckedChange={(checked) => 
                            handleGuarantorChange(checked as boolean, member.address)
                          }
                        />
                        <Label 
                          htmlFor={`guarantor-${member.address}`}
                          className="flex items-center cursor-pointer"
                        >
                          <span className="inline-block h-6 w-6 rounded-full bg-gray-200 text-xs flex items-center justify-center mr-2">
                            {member.address.slice(2, 4).toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-700">
                            {formatUserAddress(member.address)}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Select at least 2 guarantors from your group
              </p>
            </div>
          </div>
        </div>
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={
              loanRequestMutation.isPending || 
              !amount || 
              Number(amount) <= 0 || 
              selectedGuarantors.length < 2
            }
          >
            {loanRequestMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Request"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
