import { useWeb3 } from "@/hooks/use-web3";
import { useSacco } from "@/hooks/use-sacco";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function UserInfo() {
  const { address, isConnected } = useWeb3();
  const { getUserInfo, getUserGroup } = useSacco();

  const { data: userInfo, isLoading: isLoadingUser } = useQuery({
    queryKey: ["/api/users", address],
    queryFn: () => getUserInfo(address || ""),
    enabled: !!address,
  });

  const { data: groupInfo, isLoading: isLoadingGroup } = useQuery({
    queryKey: ["/api/users", address, "group"],
    queryFn: () => getUserGroup(address || ""),
    enabled: !!address && !!userInfo?.groupId,
  });

  // Get user initials from address
  const userInitials = address ? address.slice(2, 4).toUpperCase() : "??";
  
  // Format address for display
  const displayAddress = address 
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "Not Connected";

  return (
    <div>
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center">
          <span>{userInitials}</span>
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-gray-800">{displayAddress}</p>
          <div className="flex items-center">
            {isConnected ? (
              <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                <span className="mr-1 text-green-500">•</span>
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">
                <span className="mr-1 text-red-500">•</span>
                Disconnected
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex flex-col">
          <span className="text-gray-500">Credit Score</span>
          {isLoadingUser ? (
            <Skeleton className="h-5 w-8 mt-1" />
          ) : (
            <span className="font-semibold text-gray-900">{userInfo?.creditScore || "N/A"}</span>
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-gray-500">Group</span>
          {isLoadingGroup ? (
            <Skeleton className="h-5 w-20 mt-1" />
          ) : (
            <span className="font-semibold text-gray-900">{groupInfo?.name || "None"}</span>
          )}
        </div>
      </div>
    </div>
  );
}
