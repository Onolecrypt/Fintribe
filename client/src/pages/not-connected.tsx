import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWeb3 } from "@/hooks/use-web3";
import { Wallet, ShieldAlert, ArrowRight } from "lucide-react";

export default function NotConnected() {
  const { connectWallet, isConnecting } = useWeb3();
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    try {
      setError(null);
      const success = await connectWallet();
      
      // If connectWallet returned false specifically, show a message
      if (success === false) {
        setError("No web3 wallet detected. Using fallback provider for demo purposes.");
      }
    } catch (err) {
      console.error("Wallet connection error:", err);
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white mb-4">
            <Wallet className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">Connect Your Wallet</CardTitle>
          <CardDescription>
            Please connect your Ethereum wallet to access SaccoDAO
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-500">
              SaccoDAO is a decentralized savings and credit cooperative that allows you to:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-500 space-y-1">
              <li>Join or create savings groups</li>
              <li>Deposit stablecoins and earn interest</li>
              <li>Request loans with guarantors</li>
              <li>Vote on proposals</li>
            </ul>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
              <ShieldAlert className="text-red-500 mr-2 h-5 w-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full"
            onClick={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              "Connecting..."
            ) : (
              <>
                Connect Wallet
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
