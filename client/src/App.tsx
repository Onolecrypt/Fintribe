import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";

import Dashboard from "@/pages/dashboard";
import Groups from "@/pages/groups";
import Loans from "@/pages/loans";
import Guarantor from "@/pages/guarantor";
import Proposals from "@/pages/proposals";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import NotConnected from "@/pages/not-connected";

import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { useWeb3 } from "./hooks/use-web3";

function AppContent() {
  const { isConnected } = useWeb3();
  
  if (!isConnected) {
    return <NotConnected />;
  }
  
  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Sidebar />
      <MobileSidebar />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 pb-16 md:pb-6">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/groups" component={Groups} />
          <Route path="/loans" component={Loans} />
          <Route path="/guarantor" component={Guarantor} />
          <Route path="/proposals" component={Proposals} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </main>
      
      <MobileNav />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
