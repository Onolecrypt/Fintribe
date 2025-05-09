import { Link, useLocation } from "wouter";
import { useWeb3 } from "@/hooks/use-web3";
import UserInfo from "@/components/user-info";
import { useSacco } from "@/hooks/use-sacco";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  Shield, 
  FileText, 
  Settings, 
  CreditCard 
} from "lucide-react";

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isActive: boolean;
}

const NavLink = ({ href, icon, children, isActive }: NavLinkProps) => {
  return (
    <Link href={href}>
      <a
        className={cn(
          "flex items-center px-4 py-2 text-sm font-medium rounded-md",
          isActive
            ? "text-primary bg-blue-50"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        )}
      >
        <span className={cn("mr-3", isActive ? "text-primary" : "text-gray-400")}>
          {icon}
        </span>
        {children}
      </a>
    </Link>
  );
};

export default function Sidebar() {
  const [location] = useLocation();
  const { networkName } = useWeb3();
  const { gasPrice } = useSacco();
  
  // Define navigation items
  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { href: "/groups", label: "Groups", icon: <Users size={18} /> },
    { href: "/loans", label: "Loans", icon: <DollarSign size={18} /> },
    { href: "/guarantor", label: "Guarantor Requests", icon: <Shield size={18} /> },
    { href: "/proposals", label: "Proposals", icon: <FileText size={18} /> },
    { href: "/settings", label: "Settings", icon: <Settings size={18} /> },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="flex items-center justify-center h-16 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-primary">SaccoDAO</h1>
      </div>
      
      {/* User Info */}
      <div className="p-4 border-b border-gray-200">
        <UserInfo />
      </div>
      
      {/* Navigation Links */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink 
            key={item.href} 
            href={item.href} 
            icon={item.icon}
            isActive={location === item.href || (item.href === "/dashboard" && location === "/")}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      
      {/* Network Info */}
      <div className="px-4 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">Network</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
            {networkName || "Not Connected"}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">Gas Price</span>
          <span className="text-xs font-medium text-gray-900">{gasPrice || "-"} Gwei</span>
        </div>
      </div>
    </aside>
  );
}
