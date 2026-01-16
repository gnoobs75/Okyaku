import { useState, useEffect } from "react";
import { TutorialPanel } from "@/components/tutorial";
import { useTutorial } from "@/context/TutorialContext";
import { getTutorialForStage } from "@/content/tutorials";
import {
  History,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  Shield,
  Database,
  Clock,
  User,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import type {
  AuditLog,
  AuditLogStats,
  AuditAction,
  EntityType,
  DataRetentionPolicy,
  GDPRExportRequest,
} from "@/types/auditLog";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export function AuditLogPage() {
  const { token } = useAuth();
  const { tutorialMode } = useTutorial();
  const tutorial = getTutorialForStage("audit-log");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [policies, setPolicies] = useState<DataRetentionPolicy[]>([]);
  const [gdprRequests, setGdprRequests] = useState<GDPRExportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState<string>("");
  const [action, setAction] = useState<string>("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Options
  const [actions, setActions] = useState<Array<{ value: string; label: string }>>([]);
  const [entityTypes, setEntityTypes] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    fetchOptions();
    fetchStats();
    fetchPolicies();
    fetchGdprRequests();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [search, entityType, action, page]);

  const fetchOptions = async () => {
    try {
      const [actionsRes, typesRes] = await Promise.all([
        fetch(`${API_BASE}/audit/actions`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/audit/entity-types`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (actionsRes.ok) setActions(await actionsRes.json());
      if (typesRes.ok) setEntityTypes(await typesRes.json());
    } catch (error) {
      console.error("Failed to fetch options:", error);
    }
  };

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams({
        skip: String(page * limit),
        limit: String(limit),
      });
      if (search) params.append("search", search);
      if (entityType) params.append("entity_type", entityType);
      if (action) params.append("action", action);

      const response = await fetch(`${API_BASE}/audit/logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }

      // Get count
      const countRes = await fetch(`${API_BASE}/audit/logs/count?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (countRes.ok) {
        const countData = await countRes.json();
        setTotal(countData.total);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/audit/stats?days=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setStats(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const fetchPolicies = async () => {
    try {
      const response = await fetch(`${API_BASE}/audit/retention-policies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setPolicies(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch policies:", error);
    }
  };

  const fetchGdprRequests = async () => {
    try {
      const response = await fetch(`${API_BASE}/audit/gdpr/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setGdprRequests(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch GDPR requests:", error);
    }
  };

  const exportLogs = async (format: "csv" | "json") => {
    const params = new URLSearchParams();
    params.append("format", format);
    if (entityType) params.append("entity_type", entityType);
    if (action) params.append("action", action);

    window.open(`${API_BASE}/audit/export?${params}`, "_blank");
  };

  const getActionBadge = (action: AuditAction) => {
    const colors: Record<string, string> = {
      create: "bg-green-100 text-green-800",
      update: "bg-blue-100 text-blue-800",
      delete: "bg-red-100 text-red-800",
      view: "bg-gray-100 text-gray-800",
      login: "bg-purple-100 text-purple-800",
      logout: "bg-purple-100 text-purple-800",
      export: "bg-yellow-100 text-yellow-800",
    };
    return (
      <Badge className={colors[action] || "bg-gray-100 text-gray-800"}>
        {action.replace("_", " ")}
      </Badge>
    );
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {tutorialMode && tutorial && (
        <TutorialPanel tutorial={tutorial} stageId="audit-log" />
      )}

      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground">
          Track all changes and user activity across the system
        </p>
      </div>

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">
            <History className="h-4 w-4 mr-2" />
            Activity Log
          </TabsTrigger>
          <TabsTrigger value="stats">
            <FileText className="h-4 w-4 mr-2" />
            Statistics
          </TabsTrigger>
          <TabsTrigger value="retention">
            <Database className="h-4 w-4 mr-2" />
            Data Retention
          </TabsTrigger>
          <TabsTrigger value="gdpr">
            <Shield className="h-4 w-4 mr-2" />
            GDPR
          </TabsTrigger>
        </TabsList>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Activity Log</CardTitle>
                  <CardDescription>All system activity and changes</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => exportLogs("csv")}>
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button variant="outline" onClick={() => exportLogs("json")}>
                    <Download className="h-4 w-4 mr-2" />
                    JSON
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={entityType} onValueChange={setEntityType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Entity Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    {entityTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Actions</SelectItem>
                    {actions.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No audit logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {new Date(log.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                                <User className="h-3 w-3" />
                              </div>
                              <span className="text-sm">{log.user_name || log.user_email || "System"}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getActionBadge(log.action)}</TableCell>
                          <TableCell>
                            <div>
                              <span className="text-sm font-medium">{log.entity_name || "-"}</span>
                              <p className="text-xs text-muted-foreground">
                                {log.entity_type.replace("_", " ")}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                            {log.description}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLog(log)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {page * limit + 1}-{Math.min((page + 1) * limit, total)} of {total}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(page + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="space-y-4">
          {stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{stats.total_entries.toLocaleString()}</div>
                    <p className="text-sm text-muted-foreground">Total Entries (30 days)</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{stats.active_users}</div>
                    <p className="text-sm text-muted-foreground">Active Users</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {Object.keys(stats.entries_by_action).length}
                    </div>
                    <p className="text-sm text-muted-foreground">Action Types</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {Object.keys(stats.entries_by_entity_type).length}
                    </div>
                    <p className="text-sm text-muted-foreground">Entity Types</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Actions Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(stats.entries_by_action).map(([action, count]) => (
                        <div key={action} className="flex justify-between items-center">
                          <span className="text-sm capitalize">{action.replace("_", " ")}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Entity Types Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(stats.entries_by_entity_type).map(([type, count]) => (
                        <div key={type} className="flex justify-between items-center">
                          <span className="text-sm capitalize">{type.replace("_", " ")}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.recent_activity.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {getActionBadge(item.action)}
                          <div>
                            <p className="text-sm font-medium">
                              {item.entity_name || item.entity_type.replace("_", " ")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              by {item.user_name || "System"}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Retention Tab */}
        <TabsContent value="retention" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Retention Policies</CardTitle>
              <CardDescription>
                Configure how long data is retained before automatic cleanup
              </CardDescription>
            </CardHeader>
            <CardContent>
              {policies.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No retention policies configured
                </p>
              ) : (
                <div className="space-y-3">
                  {policies.map((policy) => (
                    <div
                      key={policy.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Database className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium capitalize">
                            {policy.entity_type.replace("_", " ")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Retain for {policy.retention_days} days
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={policy.is_active ? "default" : "secondary"}>
                          {policy.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {policy.auto_cleanup_enabled && (
                          <Badge variant="outline">Auto-cleanup</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* GDPR Tab */}
        <TabsContent value="gdpr" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>GDPR Data Export Requests</CardTitle>
              <CardDescription>
                Manage data export requests for GDPR compliance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {gdprRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No GDPR export requests
                </p>
              ) : (
                <div className="space-y-3">
                  {gdprRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">User: {request.user_id.slice(0, 8)}...</p>
                          <p className="text-sm text-muted-foreground">
                            Requested: {new Date(request.requested_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            request.status === "completed"
                              ? "default"
                              : request.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {request.status}
                        </Badge>
                        {request.status === "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              window.open(
                                `${API_BASE}/audit/gdpr/requests/${request.id}/download`,
                                "_blank"
                              )
                            }
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Full details of this audit log entry
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Time</Label>
                  <p>{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">User</Label>
                  <p>{selectedLog.user_name || selectedLog.user_email || "System"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Action</Label>
                  <div className="mt-1">{getActionBadge(selectedLog.action)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Entity Type</Label>
                  <p className="capitalize">{selectedLog.entity_type.replace("_", " ")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Entity Name</Label>
                  <p>{selectedLog.entity_name || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">IP Address</Label>
                  <p>{selectedLog.ip_address || "-"}</p>
                </div>
              </div>

              {selectedLog.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="mt-1">{selectedLog.description}</p>
                </div>
              )}

              {selectedLog.changed_fields && selectedLog.changed_fields.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Changed Fields</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedLog.changed_fields.map((field) => (
                      <Badge key={field} variant="outline">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.old_values && (
                <div>
                  <Label className="text-muted-foreground">Old Values</Label>
                  <pre className="mt-1 p-3 bg-muted rounded-lg text-sm overflow-auto">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_values && (
                <div>
                  <Label className="text-muted-foreground">New Values</Label>
                  <pre className="mt-1 p-3 bg-muted rounded-lg text-sm overflow-auto">
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
