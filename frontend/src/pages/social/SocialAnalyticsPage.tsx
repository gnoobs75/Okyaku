import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format, subDays } from "date-fns";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Eye,
  Users,
  Heart,
  MessageSquare,
  Share2,
  MousePointer,
  Calendar,
  RefreshCw,
  Download,
  Linkedin,
  Twitter,
  Facebook,
  ArrowUpRight,
  BarChart2,
  Inbox,
  Settings,
  Clock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TutorialPanel } from "@/components/tutorial";
import { useApi } from "@/hooks/useApi";
import { useTutorial } from "@/context/TutorialContext";
import { getTutorialForStage } from "@/content/tutorials";
import { BestTimeToPost } from "@/components/social/BestTimeToPost";
import { PlatformComparison } from "@/components/social/PlatformComparison";
import type {
  AnalyticsOverview,
  PlatformAnalytics,
  TimelineDataPoint,
  TopPost,
  EngagementBreakdown,
  AccountPerformance,
  SocialPlatform,
} from "@/types/social";

const platformIcons: Record<SocialPlatform, React.ComponentType<{ className?: string }>> = {
  linkedin: Linkedin,
  twitter: Twitter,
  facebook: Facebook,
};

const platformColors: Record<SocialPlatform, string> = {
  linkedin: "#0A66C2",
  twitter: "#1DA1F2",
  facebook: "#1877F2",
};

const ENGAGEMENT_COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00C49F"];

export function SocialAnalyticsPage() {
  const { tutorialMode } = useTutorial();
  const tutorial = getTutorialForStage("social-analytics");
  const { get } = useApi();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [platformData, setPlatformData] = useState<PlatformAnalytics[]>([]);
  const [timeline, setTimeline] = useState<TimelineDataPoint[]>([]);
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const [engagementBreakdown, setEngagementBreakdown] = useState<EngagementBreakdown | null>(null);
  const [accountPerformance, setAccountPerformance] = useState<AccountPerformance[]>([]);

  // Filters
  const [dateRange, setDateRange] = useState("30");
  const [granularity, setGranularity] = useState("day");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    const endDate = new Date();
    const startDate = subDays(endDate, parseInt(dateRange));
    const dateParams = `start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`;

    try {
      const [
        overviewData,
        platformDataResult,
        timelineData,
        topPostsData,
        engagementData,
        accountData,
      ] = await Promise.all([
        get(`/social/analytics/overview?${dateParams}`),
        get(`/social/analytics/by-platform?${dateParams}`),
        get(`/social/analytics/timeline?${dateParams}&granularity=${granularity}`),
        get(`/social/analytics/top-posts?${dateParams}&limit=5`),
        get(`/social/analytics/engagement-breakdown?${dateParams}`),
        get(`/social/analytics/account-performance?${dateParams}`),
      ]);

      if (overviewData) setOverview(overviewData as AnalyticsOverview);
      if (platformDataResult) setPlatformData(platformDataResult as PlatformAnalytics[]);
      if (timelineData) setTimeline(timelineData as TimelineDataPoint[]);
      if (topPostsData) setTopPosts(topPostsData as TopPost[]);
      if (engagementData) setEngagementBreakdown(engagementData as EngagementBreakdown);
      if (accountData) setAccountPerformance(accountData as AccountPerformance[]);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [get, dateRange, granularity]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const engagementChartData = engagementBreakdown
    ? [
        { name: "Likes", value: engagementBreakdown.likes },
        { name: "Comments", value: engagementBreakdown.comments },
        { name: "Shares", value: engagementBreakdown.shares },
        { name: "Clicks", value: engagementBreakdown.clicks },
        { name: "Saves", value: engagementBreakdown.saves },
      ].filter((item) => item.value > 0)
    : [];

  const handleExport = () => {
    // Create CSV data
    const headers = ["Metric", "Value"];
    const rows = overview
      ? [
          ["Total Posts", overview.total_posts],
          ["Total Impressions", overview.total_impressions],
          ["Total Reach", overview.total_reach],
          ["Total Engagement", overview.total_engagement],
          ["Avg Engagement Rate", `${overview.avg_engagement_rate}%`],
          ["Total Likes", overview.total_likes],
          ["Total Comments", overview.total_comments],
          ["Total Shares", overview.total_shares],
          ["Total Clicks", overview.total_clicks],
        ]
      : [];

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `social-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {tutorialMode && tutorial && (
        <TutorialPanel tutorial={tutorial} stageId="social-analytics" />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Social Analytics</h1>
          <p className="text-muted-foreground">
            Track performance across all your social platforms
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/social">
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Calendar
            </Button>
          </Link>
          <Link to="/social/inbox">
            <Button variant="outline">
              <Inbox className="mr-2 h-4 w-4" />
              Inbox
            </Button>
          </Link>
          <Link to="/social/accounts">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Accounts
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="best-times" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Best Times
            </TabsTrigger>
            <TabsTrigger value="platforms" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Platforms
            </TabsTrigger>
          </TabsList>
          <div className="flex-1" />
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-40"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="180">Last 6 months</option>
            <option value="365">Last year</option>
          </Select>
          <Select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value)}
            className="w-32"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </Select>
          <Button variant="outline" onClick={fetchAnalytics} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Best Times Tab */}
        <TabsContent value="best-times">
          <BestTimeToPost />
        </TabsContent>

        {/* Platforms Tab */}
        <TabsContent value="platforms">
          <PlatformComparison />
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview">
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Overview KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(overview?.total_impressions || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  From {overview?.total_posts || 0} posts
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(overview?.total_reach || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Unique viewers</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Engagement</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(overview?.total_engagement || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Likes, comments, shares
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Engagement Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overview?.avg_engagement_rate || 0}%
                </div>
                <p className="text-xs text-muted-foreground">Across all posts</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Timeline Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                {timeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timeline}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="impressions"
                        stroke="#8884d8"
                        name="Impressions"
                      />
                      <Line
                        type="monotone"
                        dataKey="engagement"
                        stroke="#82ca9d"
                        name="Engagement"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Platform Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Platform Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {platformData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={platformData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="platform" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="impressions" fill="#8884d8" name="Impressions" />
                      <Bar dataKey="likes" fill="#82ca9d" name="Likes" />
                      <Bar dataKey="comments" fill="#ffc658" name="Comments" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Second Row */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Engagement Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Engagement Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {engagementChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={engagementChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${((percent || 0) * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {engagementChartData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={ENGAGEMENT_COLORS[index % ENGAGEMENT_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                    No engagement data
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Account Performance */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Account Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {accountPerformance.length > 0 ? (
                  <div className="space-y-4">
                    {accountPerformance.map((account) => {
                      const PlatformIcon = platformIcons[account.platform];
                      return (
                        <div
                          key={account.account_id}
                          className="flex items-center gap-4 p-3 rounded-lg border"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={account.profile_image} />
                            <AvatarFallback>
                              <PlatformIcon className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {account.display_name || account.username}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              @{account.username}
                            </p>
                          </div>
                          <div className="flex gap-6 text-sm">
                            <div className="text-center">
                              <p className="font-semibold">{account.posts}</p>
                              <p className="text-muted-foreground">Posts</p>
                            </div>
                            <div className="text-center">
                              <p className="font-semibold">
                                {formatNumber(account.impressions)}
                              </p>
                              <p className="text-muted-foreground">Impressions</p>
                            </div>
                            <div className="text-center">
                              <p className="font-semibold">{account.engagement_rate}%</p>
                              <p className="text-muted-foreground">Eng. Rate</p>
                            </div>
                          </div>
                          <Badge
                            style={{ backgroundColor: platformColors[account.platform] }}
                            className="text-white"
                          >
                            {account.platform}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    No accounts connected
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Posts */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Posts</CardTitle>
            </CardHeader>
            <CardContent>
              {topPosts.length > 0 ? (
                <div className="space-y-4">
                  {topPosts.map((post, index) => {
                    const PlatformIcon = post.platform
                      ? platformIcons[post.platform]
                      : BarChart2;
                    return (
                      <div
                        key={post.id}
                        className="flex items-start gap-4 p-4 rounded-lg border"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm line-clamp-2">{post.content}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <PlatformIcon className="h-3 w-3" />
                            <span>@{post.platform_username}</span>
                            {post.published_at && (
                              <>
                                <span className="text-muted-foreground">-</span>
                                <span>
                                  {format(new Date(post.published_at), "MMM d, yyyy")}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                            <span>{formatNumber(post.impressions)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="h-4 w-4 text-muted-foreground" />
                            <span>{formatNumber(post.likes)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            <span>{formatNumber(post.comments)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Share2 className="h-4 w-4 text-muted-foreground" />
                            <span>{formatNumber(post.shares)}</span>
                          </div>
                        </div>
                        {post.platform_post_url && (
                          <a
                            href={post.platform_post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  No published posts in this period
                </div>
              )}
            </CardContent>
          </Card>

          {/* Engagement Stats Grid */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Likes</CardTitle>
                <Heart className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(overview?.total_likes || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Comments</CardTitle>
                <MessageSquare className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(overview?.total_comments || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Shares</CardTitle>
                <Share2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(overview?.total_shares || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clicks</CardTitle>
                <MousePointer className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(overview?.total_clicks || 0)}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
