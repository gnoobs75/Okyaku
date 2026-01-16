import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { TutorialPanel } from "@/components/tutorial";
import { useTutorial } from "@/context/TutorialContext";
import { getTutorialForStage } from "@/content/tutorials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  Plus,
  Download,
  Calendar,
  Clock,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  FileJson,
  Play,
  Pause,
  BarChart3,
} from "lucide-react";
import {
  Report,
  ReportCreate,
  ScheduledReport,
  ScheduledReportCreate,
  ReportTemplate,
  ReportingStats,
  ReportType,
  ReportFormat,
  ReportFrequency,
  ReportStatus,
} from "@/types/reporting";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const STATUS_COLORS: Record<ReportStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  generating: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-700",
};

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  social_performance: "Social Performance",
  engagement_summary: "Engagement Summary",
  content_analysis: "Content Analysis",
  audience_insights: "Audience Insights",
  competitor_comparison: "Competitor Comparison",
  ab_test_results: "A/B Test Results",
  campaign_report: "Campaign Report",
  custom: "Custom Report",
};

const FORMAT_ICONS: Record<ReportFormat, typeof FileText> = {
  pdf: FileText,
  csv: FileSpreadsheet,
  excel: FileSpreadsheet,
  json: FileJson,
};

const FREQUENCY_LABELS: Record<ReportFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Every 2 Weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

const PIE_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4"];

export function ReportingPage() {
  const { token } = useAuth();
  const { tutorialMode } = useTutorial();
  const tutorial = getTutorialForStage("reporting");
  const [activeTab, setActiveTab] = useState("reports");
  const [loading, setLoading] = useState(true);

  // Data states
  const [reports, setReports] = useState<Report[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [stats, setStats] = useState<ReportingStats | null>(null);

  // Form states
  const [showCreateReport, setShowCreateReport] = useState(false);
  const [showCreateSchedule, setShowCreateSchedule] = useState(false);
  const [newReport, setNewReport] = useState<ReportCreate>({
    name: "",
    report_type: "social_performance",
    format: "pdf",
    date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    date_to: new Date().toISOString().split("T")[0],
  });
  const [newSchedule, setNewSchedule] = useState<ScheduledReportCreate>({
    name: "",
    report_type: "social_performance",
    format: "pdf",
    frequency: "weekly",
  });

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadReports(),
        loadScheduledReports(),
        loadTemplates(),
        loadStats(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    const res = await fetch(`${API_URL}/api/v1/reporting/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setReports(await res.json());
    }
  };

  const loadScheduledReports = async () => {
    const res = await fetch(`${API_URL}/api/v1/reporting/scheduled`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setScheduledReports(await res.json());
    }
  };

  const loadTemplates = async () => {
    const res = await fetch(`${API_URL}/api/v1/reporting/templates`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setTemplates(await res.json());
    }
  };

  const loadStats = async () => {
    const res = await fetch(`${API_URL}/api/v1/reporting/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setStats(await res.json());
    }
  };

  const createReport = async () => {
    if (!newReport.name.trim()) return;

    const res = await fetch(`${API_URL}/api/v1/reporting/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newReport),
    });

    if (res.ok) {
      setNewReport({
        name: "",
        report_type: "social_performance",
        format: "pdf",
        date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        date_to: new Date().toISOString().split("T")[0],
      });
      setShowCreateReport(false);
      loadReports();
      loadStats();
    }
  };

  const deleteReport = async (reportId: string) => {
    const res = await fetch(`${API_URL}/api/v1/reporting/${reportId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      loadReports();
      loadStats();
    }
  };

  const downloadReport = async (report: Report) => {
    window.open(
      `${API_URL}/api/v1/reporting/${report.id}/download`,
      "_blank"
    );
  };

  const createScheduledReport = async () => {
    if (!newSchedule.name.trim()) return;

    const res = await fetch(`${API_URL}/api/v1/reporting/scheduled`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newSchedule),
    });

    if (res.ok) {
      setNewSchedule({
        name: "",
        report_type: "social_performance",
        format: "pdf",
        frequency: "weekly",
      });
      setShowCreateSchedule(false);
      loadScheduledReports();
      loadStats();
    }
  };

  const deleteScheduledReport = async (scheduledId: string) => {
    const res = await fetch(`${API_URL}/api/v1/reporting/scheduled/${scheduledId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      loadScheduledReports();
      loadStats();
    }
  };

  const runScheduledReport = async (scheduledId: string) => {
    const res = await fetch(
      `${API_URL}/api/v1/reporting/scheduled/${scheduledId}/run`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (res.ok) {
      loadReports();
      loadScheduledReports();
      loadStats();
    }
  };

  const generateFromTemplate = async (templateId: string) => {
    const res = await fetch(
      `${API_URL}/api/v1/reporting/templates/${templateId}/generate`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (res.ok) {
      loadReports();
      loadTemplates();
      loadStats();
    }
  };

  // Prepare chart data
  const typeChartData = stats
    ? Object.entries(stats.type_breakdown).map(([key, value]) => ({
        name: REPORT_TYPE_LABELS[key as ReportType] || key,
        value,
      }))
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tutorialMode && tutorial && (
        <TutorialPanel tutorial={tutorial} stageId="reporting" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports & Exports</h1>
          <p className="text-muted-foreground">
            Generate and download performance reports
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateReport(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Report
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <FileText className="h-4 w-4" />
              Total Reports
            </div>
            <p className="text-2xl font-bold mt-2">{stats?.total_reports || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Completed
            </div>
            <p className="text-2xl font-bold mt-2">{stats?.completed_reports || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Calendar className="h-4 w-4" />
              Scheduled
            </div>
            <p className="text-2xl font-bold mt-2">{stats?.active_schedules || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Download className="h-4 w-4" />
              Downloads
            </div>
            <p className="text-2xl font-bold mt-2">{stats?.total_downloads || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Create Report Form */}
      {showCreateReport && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">Generate New Report</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateReport(false)}
            >
              Cancel
            </Button>
          </CardHeader>
          <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Report Name *</label>
              <Input
                placeholder="e.g., Monthly Performance Report"
                value={newReport.name}
                onChange={(e) =>
                  setNewReport({ ...newReport, name: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Report Type</label>
              <select
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                value={newReport.report_type}
                onChange={(e) =>
                  setNewReport({
                    ...newReport,
                    report_type: e.target.value as ReportType,
                  })
                }
              >
                {Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Format</label>
              <select
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                value={newReport.format}
                onChange={(e) =>
                  setNewReport({
                    ...newReport,
                    format: e.target.value as ReportFormat,
                  })
                }
              >
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
                <option value="json">JSON</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Date Range</label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={newReport.date_from}
                  onChange={(e) =>
                    setNewReport({ ...newReport, date_from: e.target.value })
                  }
                />
                <span className="flex items-center text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={newReport.date_to}
                  onChange={(e) =>
                    setNewReport({ ...newReport, date_to: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <Button className="mt-4" onClick={createReport}>
            <Plus className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          {reports.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No reports yet</p>
                <p className="text-sm">Generate your first report to track performance</p>
                <Button className="mt-4" onClick={() => setShowCreateReport(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="divide-y">
              {reports.map((report) => {
                const FormatIcon = FORMAT_ICONS[report.format] || FileText;
                return (
                  <div key={report.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FormatIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{report.name}</h4>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              STATUS_COLORS[report.status]
                            }`}
                          >
                            {report.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span>{REPORT_TYPE_LABELS[report.report_type]}</span>
                          <span>•</span>
                          <span>{report.format.toUpperCase()}</span>
                          <span>•</span>
                          <span>
                            {new Date(report.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {report.status === "completed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadReport(report)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => deleteReport(report.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </TabsContent>

        {/* Scheduled Tab */}
        <TabsContent value="scheduled" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => setShowCreateSchedule(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Schedule
            </Button>
          </div>

          {showCreateSchedule && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Create Scheduled Report</CardTitle>
              </CardHeader>
              <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Name</label>
                  <Input
                    placeholder="e.g., Weekly Performance"
                    value={newSchedule.name}
                    onChange={(e) =>
                      setNewSchedule({ ...newSchedule, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Frequency</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={newSchedule.frequency}
                    onChange={(e) =>
                      setNewSchedule({
                        ...newSchedule,
                        frequency: e.target.value as ReportFrequency,
                      })
                    }
                  >
                    {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Report Type</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={newSchedule.report_type}
                    onChange={(e) =>
                      setNewSchedule({
                        ...newSchedule,
                        report_type: e.target.value as ReportType,
                      })
                    }
                  >
                    {Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Format</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={newSchedule.format}
                    onChange={(e) =>
                      setNewSchedule({
                        ...newSchedule,
                        format: e.target.value as ReportFormat,
                      })
                    }
                  >
                    <option value="pdf">PDF</option>
                    <option value="csv">CSV</option>
                    <option value="excel">Excel</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={createScheduledReport}>Create Schedule</Button>
                <Button variant="ghost" onClick={() => setShowCreateSchedule(false)}>
                  Cancel
                </Button>
              </div>
              </CardContent>
            </Card>
          )}

          {scheduledReports.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No scheduled reports</p>
                <p className="text-sm">Set up recurring reports to automate your workflow</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="divide-y">
              {scheduledReports.map((scheduled) => (
                <div key={scheduled.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{scheduled.name}</h4>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span>{FREQUENCY_LABELS[scheduled.frequency]}</span>
                        <span>•</span>
                        <span>{REPORT_TYPE_LABELS[scheduled.report_type]}</span>
                        {scheduled.next_run_at && (
                          <>
                            <span>•</span>
                            <span>
                              Next: {new Date(scheduled.next_run_at).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-right mr-4">
                      <p className="text-muted-foreground">Runs</p>
                      <p className="font-semibold">{scheduled.run_count}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runScheduledReport(scheduled.id)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Run Now
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteScheduledReport(scheduled.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          {templates.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No templates available</p>
              <p className="text-sm">Templates will appear here for quick report generation</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{template.name}</h4>
                      {template.is_system && (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                          System
                        </span>
                      )}
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-muted">
                      {template.format.toUpperCase()}
                    </span>
                  </div>
                  {template.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {template.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {template.default_days} day range • Used {template.times_used}x
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateFromTemplate(template.id)}
                    >
                      Generate
                    </Button>
                  </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Reports by Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Reports by Type</CardTitle>
              </CardHeader>
              <CardContent>
              {typeChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={typeChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {typeChartData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
              </CardContent>
            </Card>

            {/* Recent Reports */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Reports</CardTitle>
              </CardHeader>
              <CardContent>
              {stats?.recent_reports && stats.recent_reports.length > 0 ? (
                <div className="space-y-3">
                  {stats.recent_reports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-2 rounded bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{report.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {REPORT_TYPE_LABELS[report.type]} • {report.format.toUpperCase()}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          STATUS_COLORS[report.status]
                        }`}
                      >
                        {report.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  No recent reports
                </div>
              )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
