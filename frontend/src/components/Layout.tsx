import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Users, Building2, DollarSign, Activity, CheckSquare, Mail, Share2, Settings, LogOut } from "lucide-react";
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
  { path: "/email/campaigns", label: "Email", icon: Mail },
  { path: "/social", label: "Social", icon: Share2 },
  { path: "/settings", label: "Settings", icon: Settings },
];

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link to="/" className="mr-6 flex items-center space-x-2">
              <span className="font-bold text-xl">Okyaku</span>
            </Link>
          </div>
          <nav className="flex flex-1 items-center space-x-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary",
                    location.pathname === item.path ||
                      (item.path !== "/" && location.pathname.startsWith(item.path))
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground hidden md:inline">
              {user?.username}
            </span>
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container py-6">{children}</main>
    </div>
  );
}
