import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSacco } from "@/hooks/use-sacco";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { 
  DollarSign, 
  ShieldCheck, 
  Landmark, 
  User, 
  Clock,
  Users,
  CheckCircle,
  XCircle
} from "lucide-react";

interface GroupActivityProps {
  groupId?: number;
}

interface ActivityItem {
  id: number;
  groupId: number;
  userAddress: string;
  activityType: string;
  description: string;
  timestamp: string;
}

export default function GroupActivity({ groupId }: GroupActivityProps) {
  const { getGroupActivities } = useSacco();
  
  const { data: activities, isLoading } = useQuery({
    queryKey: ["/api/groups", groupId, "activities"],
    queryFn: () => getGroupActivities(groupId || 0),
    enabled: !!groupId,
  });

  // Function to get icon based on activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "deposit":
      case "withdrawal":
      case "loan_request":
      case "loan_repaid":
      case "loan_approved":
        return (
          <span className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center ring-8 ring-white">
            <DollarSign className="h-4 w-4 text-blue-600" />
          </span>
        );
      case "guarantor_added":
      case "guarantor_approved":
        return (
          <span className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center ring-8 ring-white">
            <ShieldCheck className="h-4 w-4 text-green-600" />
          </span>
        );
      case "proposal_created":
      case "vote_cast":
      case "proposal_executed":
        return (
          <span className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center ring-8 ring-white">
            <Landmark className="h-4 w-4 text-purple-600" />
          </span>
        );
      case "create_group":
      case "join_group":
        return (
          <span className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center ring-8 ring-white">
            <Users className="h-4 w-4 text-indigo-600" />
          </span>
        );
      default:
        return (
          <span className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center ring-8 ring-white">
            <User className="h-4 w-4 text-gray-600" />
          </span>
        );
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return "recently";
    }
  };

  const formatUserAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Card>
      <CardHeader className="px-4 py-4 border-b border-gray-200">
        <h3 className="text-base font-medium text-gray-900">Group Activity</h3>
      </CardHeader>
      <CardContent className="px-4 py-5">
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="relative pb-8">
                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                <div className="relative flex space-x-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !groupId ? (
          <div className="text-center p-4 text-gray-500">
            <p>Join a group to see activity</p>
          </div>
        ) : activities && activities.length > 0 ? (
          <div className="flow-root">
            <ul className="-mb-8">
              {activities.map((activity, idx) => (
                <li key={activity.id}>
                  <div className="relative pb-8">
                    {idx !== activities.length - 1 && (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                    )}
                    <div className="relative flex space-x-3">
                      <div>{getActivityIcon(activity.activityType)}</div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-700">
                            <span className="font-medium text-gray-900">
                              {formatUserAddress(activity.userAddress)}
                            </span>{" "}
                            {activity.description.replace(activity.userAddress, "")}
                          </p>
                        </div>
                        <div className="text-right text-xs whitespace-nowrap text-gray-500">
                          <time>{formatTimeAgo(activity.timestamp)}</time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-center p-4 text-gray-500">
            <p>No recent activity</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="px-4 py-4 bg-gray-50">
        <Link href="/activity">
          <a className="text-sm font-medium text-primary hover:text-blue-700">
            View all activity <span aria-hidden="true">&rarr;</span>
          </a>
        </Link>
      </CardFooter>
    </Card>
  );
}
