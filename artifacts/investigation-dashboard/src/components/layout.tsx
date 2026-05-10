import React from "react";
import { Link, useLocation } from "wouter";
import { 
  Shield, 
  LayoutDashboard, 
  Briefcase, 
  MessageSquareWarning, 
  Users, 
  TriangleAlert, 
  Network, 
  LineChart,
  LogOut,
  Bell
} from "lucide-react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarGroup, SidebarGroupContent, SidebarFooter } from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { name: "Command Center", path: "/", icon: LayoutDashboard },
  { name: "Case Management", path: "/cases", icon: Briefcase },
  { name: "Threat Alerts", path: "/alerts", icon: TriangleAlert },
  { name: "Suspect Database", path: "/suspects", icon: Users },
  { name: "OSINT Analysis", path: "/osint", icon: Network },
  { name: "Citizen Complaints", path: "/complaints", icon: MessageSquareWarning },
  { name: "Crime Analytics", path: "/crime-patterns", icon: LineChart },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-hidden">
        <Sidebar className="border-r border-border bg-card">
          <SidebarHeader className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-md">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-bold leading-tight font-mono tracking-tight text-foreground uppercase">
                  Vanguard
                </h1>
                <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                  Intel Platform
                </p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="mt-4 gap-2 px-2">
                  {NAV_ITEMS.map((item) => {
                    const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link href={item.path} className="flex items-center gap-3 font-mono text-sm h-10 transition-colors">
                            <item.icon className="h-4 w-4" />
                            <span>{item.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-muted flex items-center justify-center border border-border">
                  <span className="text-xs font-mono font-medium">OP</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-mono font-medium leading-none">Opr. 404</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Active</span>
                </div>
              </div>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <header className="h-16 border-b border-border bg-background flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-mono font-medium text-muted-foreground tracking-widest uppercase">System Nominal</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right flex flex-col items-end">
                <span className="text-xs font-mono font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                <span className="text-[10px] font-mono text-muted-foreground">{new Date().toLocaleTimeString('en-US', { hour12: false })}</span>
              </div>
              <button className="relative p-2 rounded-full hover:bg-muted transition-colors">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
              </button>
            </div>
          </header>
          
          <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
