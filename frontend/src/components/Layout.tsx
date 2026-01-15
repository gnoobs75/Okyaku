import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Users,
  Building2,
  DollarSign,
  Activity,
  CheckSquare,
  Mail,
  Share2,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart3,
  MessageSquare,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: "/", label: "Dashboard", icon: Home },
  { path: "/contacts", label: "Contacts", icon: Users },
  { path: "/companies", label: "Companies", icon: Building2 },
  { path: "/deals", label: "Deals", icon: DollarSign },
  { path: "/activities", label: "Activities", icon: Activity },
  { path: "/tasks", label: "Tasks", icon: CheckSquare },
];

const marketingItems = [
  { path: "/email/campaigns", label: "Email Campaigns", icon: Mail },
  { path: "/social", label: "Social Accounts", icon: Share2 },
  { path: "/social/calendar", label: "Social Calendar", icon: Calendar },
  { path: "/social/inbox", label: "Social Inbox", icon: MessageSquare },
  { path: "/social/analytics", label: "Analytics", icon: BarChart3 },
];

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const NavLink = ({ item }: { item: typeof navItems[0] }) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    return (
      <Link
        to={item.path}
        onClick={() => setSidebarOpen(false)}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
          active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-muted">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 w-full bg-card border-b shadow-sm">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-bold text-xl text-primary">Okyaku</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r shadow-lg transform transition-transform lg:translate-x-0 lg:static lg:shadow-none",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="hidden lg:flex items-center gap-2 h-16 px-6 border-b bg-secondary">
              <span className="font-bold text-2xl text-white tracking-tight">Okyaku</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-6 mt-14 lg:mt-0">
              {/* Main Navigation */}
              <div className="space-y-1">
                <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  CRM
                </p>
                {navItems.map((item) => (
                  <NavLink key={item.path} item={item} />
                ))}
              </div>

              {/* Marketing Navigation */}
              <div className="space-y-1">
                <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Marketing
                </p>
                {marketingItems.map((item) => (
                  <NavLink key={item.path} item={item} />
                ))}
              </div>

              {/* Settings */}
              <div className="space-y-1">
                <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  System
                </p>
                <NavLink item={{ path: "/settings", label: "Settings", icon: Settings }} />
              </div>
            </nav>

            {/* User Section */}
            <div className="p-4 border-t bg-muted/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                  {user?.username?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-screen">
          {/* Top Bar */}
          <div className="hidden lg:flex items-center justify-between h-16 px-8 bg-card border-b">
            <div>
              <h1 className="text-lg font-semibold capitalize">
                {location.pathname === "/"
                  ? "Dashboard"
                  : location.pathname.split("/")[1].replace(/-/g, " ")}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Welcome, <span className="font-medium text-foreground">{user?.username}</span>
              </span>
            </div>
          </div>

          {/* Page Content */}
          <div className="p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
