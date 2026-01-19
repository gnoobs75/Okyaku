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
  CalendarRange,
  Sparkles,
  FolderOpen,
  Ear,
  Hash,
  Target,
  FlaskConical,
  Zap,
  FileBarChart,
  History,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  BookOpen,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TutorialToggle } from "@/components/tutorial";
import { PerformanceMonitor } from "@/components/PerformanceMonitor";
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

// Marketing sub-sections - organized by workflow
const emailItems = [
  { path: "/email/campaigns", label: "Campaigns", icon: Mail },
  { path: "/email/templates", label: "Templates", icon: FileText },
];

// Publishing: Create & Schedule content
const publishingItems = [
  { path: "/social", label: "Schedule", icon: CalendarRange },
  { path: "/social/ai", label: "AI Content", icon: Sparkles },
  { path: "/social/library", label: "Library", icon: FolderOpen },
];

// Engagement: Connect with audience
const engagementItems = [
  { path: "/social/accounts", label: "Accounts", icon: Share2 },
  { path: "/social/inbox", label: "Inbox", icon: MessageSquare },
  { path: "/social/automation", label: "Automation", icon: Zap },
];

// Analytics: Measure & optimize
const analyticsItems = [
  { path: "/social/analytics", label: "Overview", icon: BarChart3 },
  { path: "/social/listening", label: "Listening", icon: Ear },
  { path: "/social/hashtags", label: "Hashtags", icon: Hash },
  { path: "/social/competitors", label: "Competitors", icon: Target },
  { path: "/social/ab-testing", label: "A/B Testing", icon: FlaskConical },
  { path: "/social/reports", label: "Reports", icon: FileBarChart },
];

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    email: false,
    publishing: true,
    engagement: false,
    analytics: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const isSectionActive = (items: typeof navItems) => {
    return items.some((item) => isActive(item.path));
  };

  const NavLink = ({ item, compact = false }: { item: typeof navItems[0]; compact?: boolean }) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    return (
      <Link
        to={item.path}
        onClick={() => setSidebarOpen(false)}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all duration-150",
          compact && "pl-9",
          active
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
        )}
      >
        <Icon className={cn("shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  const SectionHeader = ({
    label,
    expanded,
    onToggle,
    hasActiveItem
  }: {
    label: string;
    expanded: boolean;
    onToggle: () => void;
    hasActiveItem: boolean;
  }) => (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-center justify-between w-full px-3 py-2 text-xs font-medium tracking-wide rounded-md transition-colors",
        hasActiveItem
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      <span>{label}</span>
      {expanded ? (
        <ChevronDown className="h-3.5 w-3.5" />
      ) : (
        <ChevronRight className="h-3.5 w-3.5" />
      )}
    </button>
  );

  const CollapsibleSection = ({
    label,
    sectionKey,
    items,
  }: {
    label: string;
    sectionKey: string;
    items: typeof navItems;
  }) => {
    const expanded = expandedSections[sectionKey];
    const hasActiveItem = isSectionActive(items);

    return (
      <div className="space-y-0.5">
        <SectionHeader
          label={label}
          expanded={expanded}
          onToggle={() => toggleSection(sectionKey)}
          hasActiveItem={hasActiveItem}
        />
        {expanded && (
          <div className="space-y-0.5 mt-0.5">
            {items.map((item) => (
              <NavLink key={item.path} item={item} compact />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-muted">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 w-full bg-card border-b shadow-sm">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/header-logo-compact.svg" alt="Okyaku" className="h-10 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <TutorialToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
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
            <div className="hidden lg:flex items-center justify-center h-16 px-4 border-b bg-card">
              <img src="/header-logo-wide.svg" alt="Okyaku" className="h-10 w-auto" />
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1 mt-14 lg:mt-0">
              {/* Main CRM Navigation */}
              <div className="space-y-0.5 pb-2">
                <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
                  CRM
                </p>
                {navItems.map((item) => (
                  <NavLink key={item.path} item={item} />
                ))}
              </div>

              <div className="h-px bg-border/50 mx-2" />

              {/* Marketing Navigation - Organized by Workflow */}
              <div className="space-y-1 py-2">
                <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
                  Marketing
                </p>

                {/* Email Marketing */}
                <CollapsibleSection
                  label="Email"
                  sectionKey="email"
                  items={emailItems}
                />

                {/* Publishing: Create & Schedule */}
                <CollapsibleSection
                  label="Publishing"
                  sectionKey="publishing"
                  items={publishingItems}
                />

                {/* Engagement: Connect & Respond */}
                <CollapsibleSection
                  label="Engagement"
                  sectionKey="engagement"
                  items={engagementItems}
                />

                {/* Analytics: Measure & Optimize */}
                <CollapsibleSection
                  label="Analytics"
                  sectionKey="analytics"
                  items={analyticsItems}
                />
              </div>

              <div className="h-px bg-border/50 mx-2" />

              {/* System */}
              <div className="space-y-0.5 pt-2">
                <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
                  System
                </p>
                <NavLink item={{ path: "/calendar", label: "Calendar", icon: CalendarDays }} />
                <NavLink item={{ path: "/audit-log", label: "Audit Log", icon: History }} />
                <NavLink item={{ path: "/settings", label: "Settings", icon: Settings }} />
              </div>
            </nav>

            {/* User Section */}
            <div className="p-3 border-t bg-card/50 space-y-2">
              {/* User Info */}
              <div className="flex items-center gap-2.5 px-2 py-1.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm shrink-0">
                  {user?.username?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate leading-tight">{user?.username}</p>
                  <p className="text-[11px] text-muted-foreground truncate leading-tight">{user?.email}</p>
                </div>
              </div>
              {/* User Menu Links */}
              <div className="space-y-0.5">
                <Link
                  to="/documentation"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Documentation</span>
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors w-full"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
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
              <TutorialToggle />
              <span className="text-sm text-muted-foreground">
                Welcome, <span className="font-medium text-foreground">{user?.username}</span>
              </span>
            </div>
          </div>

          {/* Page Content */}
          <div className="p-4 lg:p-8">{children}</div>
        </main>
      </div>

      {/* Performance Monitor */}
      <PerformanceMonitor refreshInterval={30000} />
    </div>
  );
}
