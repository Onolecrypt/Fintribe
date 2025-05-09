import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWeb3 } from "@/hooks/use-web3";
import { useSacco } from "@/hooks/use-sacco";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, Plus, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Groups() {
  const { address } = useWeb3();
  const { getAllGroups, getUserGroup } = useSacco();
  const { toast } = useToast();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  // Get all groups
  const { data: groups, isLoading: isLoadingGroups } = useQuery({
    queryKey: ["/api/groups"],
    queryFn: getAllGroups
  });

  // Get user's current group
  const { data: userGroup } = useQuery({
    queryKey: ["/api/users", address, "group"],
    queryFn: () => getUserGroup(address || ""),
    enabled: !!address
  });

  // Create group mutation
  const createGroup = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/groups", {
        name,
        admin: address
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", address, "group"] });
      setCreateModalOpen(false);
      setGroupName("");
      toast({
        title: "Success",
        description: "Group created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create group: ${error}`,
        variant: "destructive",
      });
    }
  });

  // Join group mutation
  const joinGroup = useMutation({
    mutationFn: async (groupId: number) => {
      const res = await apiRequest("POST", `/api/groups/${groupId}/members`, {
        memberAddress: address
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", address, "group"] });
      setJoinModalOpen(false);
      setSelectedGroupId(null);
      toast({
        title: "Success",
        description: "Joined group successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to join group: ${error}`,
        variant: "destructive",
      });
    }
  });

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (groupName.trim()) {
      createGroup.mutate(groupName);
    }
  };

  const handleJoinGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGroupId !== null) {
      joinGroup.mutate(selectedGroupId);
    }
  };

  const isUserInGroup = !!userGroup;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Groups</h2>
        <div className="flex space-x-2">
          {!isUserInGroup && (
            <>
              <Button 
                variant="outline" 
                onClick={() => setJoinModalOpen(true)}
                disabled={!groups || groups.length === 0}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Join Group
              </Button>
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Group
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Current Group */}
      {isUserInGroup && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Your Group</h3>
          <Card>
            <CardHeader>
              <CardTitle>{userGroup?.name}</CardTitle>
              <CardDescription>
                Admin: {userGroup?.admin === address ? 'You' : `${userGroup?.admin.slice(0, 6)}...${userGroup?.admin.slice(-4)}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total Deposits</p>
                  <p className="text-lg font-semibold">{userGroup?.totalDeposits} USDC</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Loaned</p>
                  <p className="text-lg font-semibold">{userGroup?.totalLoaned} USDC</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={() => {
                // Navigate to members page or show members modal
                toast({
                  title: "View Members",
                  description: "This would show all group members",
                });
              }}>
                <Users className="mr-2 h-4 w-4" />
                View Members
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* All Groups */}
      {!isUserInGroup && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Available Groups</h3>
          
          {isLoadingGroups ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : groups && groups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group) => (
                <Card key={group.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle>{group.name}</CardTitle>
                    <CardDescription>
                      Admin: {group.admin.slice(0, 6)}...{group.admin.slice(-4)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Total Deposits</p>
                        <p className="text-lg font-semibold">{group.totalDeposits} USDC</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Loaned</p>
                        <p className="text-lg font-semibold">{group.totalLoaned} USDC</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button onClick={() => {
                      setSelectedGroupId(group.id);
                      setJoinModalOpen(true);
                    }}>
                      Join Group
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 bg-white rounded-lg shadow">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No groups available</h3>
              <p className="mt-1 text-sm text-gray-500">
                Create a new group to get started with SaccoDAO
              </p>
              <div className="mt-6">
                <Button onClick={() => setCreateModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Group
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Group Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Start a new Sacco group and invite members to join.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateGroup}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="group-name">Group Name</Label>
                <Input
                  id="group-name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createGroup.isPending}>
                {createGroup.isPending ? "Creating..." : "Create Group"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Join Group Modal */}
      <Dialog open={joinModalOpen} onOpenChange={setJoinModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Group</DialogTitle>
            <DialogDescription>
              Join an existing Sacco group to start saving and applying for loans.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleJoinGroup}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="group-select">Select Group</Label>
                <select
                  id="group-select"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedGroupId || ""}
                  onChange={(e) => setSelectedGroupId(Number(e.target.value))}
                  required
                >
                  <option value="">Select a group</option>
                  {groups?.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setJoinModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={joinGroup.isPending || !selectedGroupId}>
                {joinGroup.isPending ? "Joining..." : "Join Group"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
