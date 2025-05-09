import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, DollarSign, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileNav() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path || (path === "/dashboard" && location === "/");
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center p-2 z-10">
      <Link href="/dashboard">
        <a className={cn(
          "flex flex-col items-center px-3 py-2",
          isActive("/dashboard") ? "text-primary" : "text-gray-500"
        )}>
          <LayoutDashboard className="text-lg h-5 w-5" />
          <span className="text-xs mt-1">Dashboard</span>
        </a>
      </Link>
      
      <Link href="/groups">
        <a className={cn(
          "flex flex-col items-center px-3 py-2",
          isActive("/groups") ? "text-primary" : "text-gray-500"
        )}>
          <Users className="text-lg h-5 w-5" />
          <span className="text-xs mt-1">Groups</span>
        </a>
      </Link>
      
      <Link href="/loans">
        <a className={cn(
          "flex flex-col items-center px-3 py-2",
          isActive("/loans") ? "text-primary" : "text-gray-500"
        )}>
          <DollarSign className="text-lg h-5 w-5" />
          <span className="text-xs mt-1">Loans</span>
        </a>
      </Link>
      
      <Link href="/guarantor">
        <a className={cn(
          "flex flex-col items-center px-3 py-2",
          isActive("/guarantor") ? "text-primary" : "text-gray-500"
        )}>
          <Shield className="text-lg h-5 w-5" />
          <span className="text-xs mt-1">Guarantor</span>
        </a>
      </Link>
    </div>
  );
}
