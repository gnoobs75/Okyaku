import { useState, useEffect } from "react";
import { History, ChevronDown, ChevronUp, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/context/AuthContext";
import type { AuditLog, AuditAction, EntityType } from "@/types/auditLog";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

interface AuditHistoryPanelProps {
  entityType: EntityType;
  entityId: string;
  title?: string;
  maxItems?: number;
  compact?: boolean;
}

export function AuditHistoryPanel({
  entityType,
  entityId,
  title = "Change History",
  maxItems = 10,
  compact = false,
}: AuditHistoryPanelProps) {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [entityType, entityId]);

  const fetchHistory = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/audit/entity/${entityType}/${entityId}/history?limit=${maxItems}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error("Failed to fetch audit history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: AuditAction) => {
    const colors: Record<string, string> = {
      create: "bg-green-100 text-green-800",
      update: "bg-blue-100 text-blue-800",
      delete: "bg-red-100 text-red-800",
      view: "bg-gray-100 text-gray-800",
    };
    return (
      <Badge className={colors[action] || "bg-gray-100 text-gray-800"} variant="secondary">
        {action}
      </Badge>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes}m ago`;
      }
      return `${hours}h ago`;
    }
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderChanges = (log: AuditLog) => {
    if (!log.changed_fields || log.changed_fields.length === 0) {
      return null;
    }

    return (
      <div className="mt-2 pl-4 border-l-2 border-muted space-y-1">
        {log.changed_fields.map((field) => {
          const oldVal = log.old_values?.[field];
          const newVal = log.new_values?.[field];
          return (
            <div key={field} className="text-xs">
              <span className="font-medium text-muted-foreground">{field}:</span>{" "}
              {oldVal !== undefined && (
                <>
                  <span className="line-through text-red-600/70">{String(oldVal)}</span>
                  {" → "}
                </>
              )}
              <span className="text-green-600">{String(newVal)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading history...
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <History className="h-4 w-4" />
          {title}
        </div>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No history available</p>
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between text-sm py-1 border-b last:border-0"
              >
                <div className="flex items-center gap-2">
                  {getActionBadge(log.action)}
                  <span className="text-muted-foreground">
                    by {log.user_name || "System"}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(log.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No history available
          </p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <Collapsible
                key={log.id}
                open={expanded === log.id}
                onOpenChange={(open) => setExpanded(open ? log.id : null)}
              >
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getActionBadge(log.action)}
                        <span className="text-sm font-medium">
                          {log.user_name || log.user_email || "System"}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                    {log.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {log.description}
                      </p>
                    )}
                    {log.changed_fields && log.changed_fields.length > 0 && (
                      <>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 mt-1 text-xs"
                          >
                            {expanded === log.id ? (
                              <>
                                <ChevronUp className="h-3 w-3 mr-1" />
                                Hide changes
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3 mr-1" />
                                Show {log.changed_fields.length} change(s)
                              </>
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          {renderChanges(log)}
                        </CollapsibleContent>
                      </>
                    )}
                  </div>
                </div>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
