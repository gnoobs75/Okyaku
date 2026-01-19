import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Building2,
  DollarSign,
  TrendingUp,
  Activity,
  CheckSquare,
  AlertTriangle,
  RefreshCw,
  Calendar,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TutorialPanel, TutorialButton } from "@/components/tutorial";
import { useApi } from "@/hooks/useApi";
import { useDrillDown } from "@/hooks/useDrillDown";
import { useTutorial } from "@/context/TutorialContext";
import { getTutorialForStage } from "@/content/tutorials";
import type {
  DashboardMetrics,
  PipelineFunnel,
  DealForecast,
  ActivityLeaderboard,
  RecentActivity,
  UpcomingTask,
} from "@/types/dashboard";

// Ronin color scheme for charts
const FUNNEL_COLORS = [
  "#C52638", // Ronin Red (primary)
  "#3F465B", // Dark Navy (secondary)
  "#445781", // Muted Blue
  "#39364E", // Dark Charcoal
  "#6B7280", // Gray
  "#9CA3AF", // Light Gray
];

const CHART_COLORS = {
  primary: "#C52638",
  secondary: "#3F465B",
  success: "#22c55e",
  accent: "#445781",
};

const formatCurrency = (value: number | undefined | null) => {
  if (value == null) return "$0";
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

export function DashboardPage() {
  const { push } = useDrillDown();
  const { tutorialMode } = useTutorial();
  const tutorial = getTutorialForStage("dashboard");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { get: getMetrics, data: metrics } = useApi<DashboardMetrics>();
  const { get: getFunnel, data: funnel } = useApi<PipelineFunnel>();
  const { get: getForecast, data: forecast } = useApi<DealForecast>();
  const { get: getLeaderboard, data: leaderboard } = useApi<ActivityLeaderboard>();
  const { get: getRecentActivities, data: recentActivities } = useApi<{ activities: RecentActivity[] }>();
  const { get: getUpcomingTasks, data: upcomingTasks } = useApi<{ tasks: UpcomingTask[] }>();

  const loadDashboard = useCallback(async () => {
    setIsRefreshing(true);
    const params = new URLSearchParams({
      date_from: dateFrom,
      date_to: dateTo,
    });

    await Promise.all([
      getMetrics(`/dashboard/metrics?${params}`),
      getFunnel("/dashboard/pipeline-funnel"),
      getForecast("/dashboard/forecast"),
      getLeaderboard(`/dashboard/activity-leaderboard?${params}`),
      getRecentActivities("/dashboard/recent-activities"),
      getUpcomingTasks("/dashboard/upcoming-tasks"),
    ]);

    setIsRefreshing(false);
  }, [dateFrom, dateTo, getMetrics, getFunnel, getForecast, getLeaderboard, getRecentActivities, getUpcomingTasks]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const funnelData = funnel?.stages.map((stage) => ({
    name: stage.stage_name,
    value: stage.deal_count,
    fill: FUNNEL_COLORS[funnel.stages.indexOf(stage) % FUNNEL_COLORS.length],
    dealValue: stage.deal_value,
  })) || [];

  const forecastData = forecast?.forecast || [];

  return (
    <div className="space-y-6">
      {tutorialMode && tutorial && (
        <TutorialPanel tutorial={tutorial} stageId="dashboard" />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your CRM performance
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="date-from" className="sr-only">
              From
            </Label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-36"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-36"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={loadDashboard}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          {tutorial && <TutorialButton tutorial={tutorial} />}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card
          className="cursor-pointer hover:border-primary/50"
          onClick={() => push({ type: 'contacts-list', title: 'All Contacts' })}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totals.contacts || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{metrics?.period_metrics.new_contacts || 0} this period
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary/50"
          onClick={() => push({ type: 'companies-list', title: 'All Companies' })}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totals.companies || 0}</div>
            <p className="text-xs text-muted-foreground">
              Business accounts
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary/50"
          onClick={() => push({ type: 'deals-list', title: 'Pipeline Deals', filters: { status: 'open' } })}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.totals.pipeline_value || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.totals.deals || 0} open deals
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary/50"
          onClick={() => push({ type: 'contacts-by-status', title: 'Customers', status: 'customer' })}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.conversion_rate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Contacts to customers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card
          className="cursor-pointer hover:border-primary/50"
          onClick={() => push({ type: 'activities-list', title: 'Activities', filters: { date_from: dateFrom, date_to: dateTo } })}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activities</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.period_metrics.activities_count || 0}
            </div>
            <p className="text-xs text-muted-foreground">This period</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary/50"
          onClick={() => push({ type: 'tasks-list', title: 'Open Tasks', filters: { status: 'pending' } })}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.tasks.open || 0}</div>
            <p className="text-xs text-muted-foreground">Pending completion</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary/50"
          onClick={() => push({ type: 'tasks-list', title: 'Overdue Tasks', filters: { overdue: true } })}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics?.tasks.overdue || 0}
            </div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary/50"
          onClick={() => push({ type: 'deals-list', title: 'Closed Deals', filters: { status: 'closed' } })}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed Deals</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(metrics?.period_metrics.closed_deals_value || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.period_metrics.closed_deals_count || 0} deals this period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pipeline Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Sales Pipeline</span>
              {funnel?.pipeline && (
                <Badge variant="secondary">{funnel.pipeline.name}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {funnelData.length > 0 ? (
              <div className="h-[300px] min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                  <FunnelChart>
                    <Tooltip
                      formatter={(value, name, props) => [
                        `${value} deals - ${formatCurrency(props.payload.dealValue)}`,
                        props.payload.name,
                      ]}
                    />
                    <Funnel
                      dataKey="value"
                      data={funnelData}
                      isAnimationActive
                      onClick={(data, index) => {
                        if (funnel?.stages[index]) {
                          push({
                            type: 'pipeline-stage',
                            title: funnel.stages[index].stage_name,
                            stageId: funnel.stages[index].stage_id,
                            stageName: funnel.stages[index].stage_name,
                            pipelineId: funnel.pipeline?.id || '',
                          });
                        }
                      }}
                    >
                      <LabelList
                        position="right"
                        fill="#000"
                        stroke="none"
                        dataKey="name"
                      />
                      {funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} className="cursor-pointer" />
                      ))}
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No pipeline data available
              </div>
            )}
            {funnel && (
              <div className="mt-4 flex justify-between text-sm">
                <span>
                  Total Value:{" "}
                  <strong>{formatCurrency(funnel.total_value)}</strong>
                </span>
                <span>
                  Weighted:{" "}
                  <strong>{formatCurrency(funnel.weighted_total)}</strong>
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deal Forecast */}
        <Card>
          <CardHeader>
            <CardTitle>Deal Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            {forecastData.length > 0 ? (
              <div className="h-[300px] min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                  <BarChart
                    data={forecastData}
                    onClick={(data) => {
                      if (data?.activePayload?.[0]?.payload) {
                        const payload = data.activePayload[0].payload;
                        push({
                          type: 'forecast-month',
                          title: `${payload.month_label} Forecast`,
                          month: payload.month,
                          monthLabel: payload.month_label,
                        });
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month_label" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar
                      dataKey="expected_value"
                      name="Expected"
                      fill={CHART_COLORS.primary}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="closed_value"
                      name="Closed"
                      fill={CHART_COLORS.secondary}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No forecast data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity and Tasks Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activity Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboard?.leaderboard && leaderboard.leaderboard.length > 0 ? (
              <div className="space-y-4">
                {leaderboard.leaderboard.slice(0, 5).map((entry, index) => (
                  <div
                    key={entry.user_id}
                    className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                    onClick={() => push({
                      type: 'user-activities',
                      title: `${entry.user_name}'s Activities`,
                      userId: entry.user_id,
                      userName: entry.user_name,
                      dateFrom,
                      dateTo,
                    })}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0
                          ? "bg-yellow-100 text-yellow-800"
                          : index === 1
                          ? "bg-gray-100 text-gray-800"
                          : index === 2
                          ? "bg-orange-100 text-orange-800"
                          : "bg-blue-50 text-blue-800"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{entry.user_name}</p>
                    </div>
                    <Badge variant="secondary">{entry.activity_count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No activities logged this period
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Activities
              </span>
              <Link to="/activities">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities?.activities && recentActivities.activities.length > 0 ? (
              <div className="space-y-3">
                {recentActivities.activities.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 text-sm cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                    onClick={() => push({
                      type: 'activity-detail',
                      title: activity.subject,
                      activityId: activity.id,
                    })}
                  >
                    <Badge variant="outline" className="capitalize">
                      {activity.type}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{activity.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(activity.activity_date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No recent activities
              </p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Upcoming Tasks
              </span>
              <Link to="/tasks">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingTasks?.tasks && upcomingTasks.tasks.length > 0 ? (
              <div className="space-y-3">
                {upcomingTasks.tasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 text-sm cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                    onClick={() => push({
                      type: 'task-detail',
                      title: task.title,
                      taskId: task.id,
                    })}
                  >
                    <Badge
                      variant={
                        task.priority === "high"
                          ? "destructive"
                          : task.priority === "medium"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {task.priority}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{task.title}</p>
                      {task.due_date && (
                        <p className="text-xs text-muted-foreground">
                          Due {formatDate(task.due_date)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No upcoming tasks
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contact Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Contacts by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {metrics?.contacts_by_status &&
              Object.entries(metrics.contacts_by_status).map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center gap-2 bg-muted rounded-lg px-4 py-2 cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => push({
                    type: 'contacts-by-status',
                    title: `${status.charAt(0).toUpperCase() + status.slice(1)} Contacts`,
                    status,
                  })}
                >
                  <Badge
                    className={
                      status === "lead"
                        ? "bg-blue-100 text-blue-800"
                        : status === "prospect"
                        ? "bg-yellow-100 text-yellow-800"
                        : status === "customer"
                        ? "bg-green-100 text-green-800"
                        : status === "churned"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }
                  >
                    {status}
                  </Badge>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
