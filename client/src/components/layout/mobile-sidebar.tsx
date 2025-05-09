import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { X, Menu } from "lucide-react";
import UserInfo from "@/components/user-info";
import { useWeb3 } from "@/hooks/use-web3";
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

export default function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { networkName } = useWeb3();

  // Close the sidebar when the location changes
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  // Handle outside clicks
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const sidebar = document.getElementById("mobile-sidebar");
      const menuBtn = document.getElementById("mobile-menu-btn");
      
      if (
        isOpen && 
        sidebar && 
        menuBtn && 
        !sidebar.contains(e.target as Node) && 
        !menuBtn.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

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
    <>
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between h-16 px-4">
          <Link href="/">
            <a className="text-xl font-semibold text-primary">SaccoDAO</a>
          </Link>
          <button 
            id="mobile-menu-btn"
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            onClick={() => setIsOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* Mobile Navigation Sidebar */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-20 bg-gray-900 bg-opacity-50">
          <div 
            id="mobile-sidebar"
            className="absolute top-0 right-0 bottom-0 w-64 bg-white p-4 transform transition-transform"
          >
            <div className="flex justify-end">
              <button 
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mt-4 border-b border-gray-200 pb-4">
              <UserInfo />
            </div>
            
            <nav className="mt-4 space-y-1">
              {navItems.map((item) => {
                const isActive = location === item.href || (item.href === "/dashboard" && location === "/");
                
                return (
                  <Link key={item.href} href={item.href}>
                    <a className={cn(
                      "flex items-center px-4 py-2 text-sm font-medium rounded-md",
                      isActive
                        ? "text-primary bg-blue-50"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}>
                      <span className={cn("mr-3", isActive ? "text-primary" : "text-gray-400")}>
                        {item.icon}
                      </span>
                      {item.label}
                    </a>
                  </Link>
                );
              })}
            </nav>
            
            <div className="mt-6 border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Network</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                  {networkName || "Not Connected"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
