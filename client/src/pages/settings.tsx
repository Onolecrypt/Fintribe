import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Wallet, Database, Eye, EyeOff, NetworkIcon, AlertTriangle } from "lucide-react";
import { useWeb3 } from "@/hooks/use-web3";
import { useSacco } from "@/hooks/use-sacco";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  const { address, networkName, switchNetwork, disconnectWallet } = useWeb3();
  const { contractAddress } = useSacco();
  const [showAddress, setShowAddress] = useState(false);
  
  const formattedAddress = address 
    ? (showAddress 
      ? address 
      : `${address.slice(0, 6)}...${address.slice(-4)}`) 
    : "";

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast({
        title: "Address Copied",
        description: "Your wallet address has been copied to clipboard",
      });
    }
  };

  const handleCopyContract = () => {
    if (contractAddress) {
      navigator.clipboard.writeText(contractAddress);
      toast({
        title: "Contract Address Copied",
        description: "The contract address has been copied to clipboard",
      });
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Settings</h2>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="contract">Contract</TabsTrigger>
        </TabsList>

        {/* Account Settings */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wallet className="mr-2 h-5 w-5" />
                Wallet Information
              </CardTitle>
              <CardDescription>
                View and manage your wallet settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wallet-address">Your Wallet Address</Label>
                <div className="flex items-center relative">
                  <Input 
                    id="wallet-address" 
                    value={formattedAddress} 
                    readOnly 
                    className="pr-10"
                  />
                  <button 
                    type="button" 
                    className="absolute right-3 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowAddress(!showAddress)}
                  >
                    {showAddress ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-1"
                  onClick={handleCopyAddress}
                >
                  Copy Address
                </Button>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-md font-medium">Disconnect Wallet</h3>
                  <p className="text-sm text-gray-500">Disconnect your wallet from this application</p>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={handleDisconnect}
                >
                  Disconnect
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Network Settings */}
        <TabsContent value="network">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <NetworkIcon className="mr-2 h-5 w-5" />
                Network Settings
              </CardTitle>
              <CardDescription>
                Configure the blockchain network settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-network">Current Network</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    id="current-network" 
                    value={networkName || "Not connected"} 
                    readOnly 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="network-select">Switch Network</Label>
                <Select onValueChange={(value) => switchNetwork(value)}>
                  <SelectTrigger id="network-select">
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Ethereum Mainnet</SelectItem>
                    <SelectItem value="5">Goerli Testnet</SelectItem>
                    <SelectItem value="11155111">Sepolia Testnet</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  You will be prompted to switch networks in your wallet
                </p>
              </div>

              <div className="p-4 bg-yellow-50 rounded-md mt-4 border border-yellow-100">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">Network Information</h4>
                    <p className="text-xs text-yellow-700 mt-1">
                      For testing purposes, we recommend using Goerli or Sepolia testnets. 
                      Using the mainnet will involve real ETH and should only be done if you 
                      fully understand the implications.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contract Settings */}
        <TabsContent value="contract">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5" />
                Contract Information
              </CardTitle>
              <CardDescription>
                View details about the SaccoDAO smart contract
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contract-address">Contract Address</Label>
                <Input 
                  id="contract-address" 
                  value={contractAddress || "Not connected"} 
                  readOnly 
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-1"
                  onClick={handleCopyContract}
                  disabled={!contractAddress}
                >
                  Copy Address
                </Button>
              </div>

              <div className="p-4 bg-blue-50 rounded-md mt-4 border border-blue-100">
                <h4 className="text-sm font-medium text-blue-800">About SaccoDAO</h4>
                <p className="text-xs text-blue-700 mt-1">
                  SaccoDAO is a decentralized savings and credit cooperative smart contract built on Ethereum.
                  It allows users to pool funds, provide loans to members, and collectively make financial decisions
                  through a governance system.
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  The contract implements features like:
                </p>
                <ul className="text-xs text-blue-700 mt-1 list-disc list-inside">
                  <li>Group management and membership</li>
                  <li>Deposit and withdrawal of stablecoins</li>
                  <li>Loan requests with guarantor system</li>
                  <li>Interest calculations</li>
                  <li>Governance through proposals and voting</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
