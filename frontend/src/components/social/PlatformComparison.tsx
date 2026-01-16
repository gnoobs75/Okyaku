import { useCallback, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  Linkedin,
  Twitter,
  Facebook,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/useApi";
import type { PlatformComparisonResult, SocialPlatform } from "@/types/social";

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

const platformNames: Record<SocialPlatform, string> = {
  linkedin: "LinkedIn",
  twitter: "Twitter/X",
  facebook: "Facebook",
};

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function getTrendIcon(current: number, average: number) {
  const diff = ((current - average) / (average || 1)) * 100;
  if (diff > 10) return <ArrowUp className="h-4 w-4 text-green-500" />;
  if (diff < -10) return <ArrowDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export function PlatformComparison() {
  const { get } = useApi();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PlatformComparisonResult | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await get("/social/analytics/platform-comparison?days_lookback=30");
      if (result) setData(result as PlatformComparisonResult);
    } catch (error) {
      console.error("Failed to fetch platform comparison:", error);
    } finally {
      setLoading(false);
    }
  }, [get]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Platform Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.platforms.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Platform Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No platform data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals for comparison
  const totalPosts = data.platforms.reduce((sum, p) => sum + p.post_count, 0);
  const totalImpressions = data.platforms.reduce((sum, p) => sum + p.total_impressions, 0);
  const totalEngagement = data.platforms.reduce(
    (sum, p) => sum + p.total_likes + p.total_comments + p.total_shares,
    0
  );
  const avgEngagementRate =
    data.platforms.reduce((sum, p) => sum + p.avg_engagement_rate, 0) / data.platforms.length;

  // Bar chart data
  const barChartData = data.platforms.map((p) => ({
    platform: platformNames[p.platform] || p.platform,
    Impressions: p.total_impressions,
    Reach: p.total_reach,
    Likes: p.total_likes,
    Comments: p.total_comments,
    Shares: p.total_shares,
  }));

  // Radar chart data - normalized for comparison
  const maxValues = {
    impressions: Math.max(...data.platforms.map((p) => p.total_impressions)),
    reach: Math.max(...data.platforms.map((p) => p.total_reach)),
    likes: Math.max(...data.platforms.map((p) => p.total_likes)),
    comments: Math.max(...data.platforms.map((p) => p.total_comments)),
    shares: Math.max(...data.platforms.map((p) => p.total_shares)),
    engagement_rate: Math.max(...data.platforms.map((p) => p.avg_engagement_rate)),
  };

  const radarData = [
    { metric: "Impressions", ...Object.fromEntries(
      data.platforms.map((p) => [
        platformNames[p.platform],
        maxValues.impressions ? (p.total_impressions / maxValues.impressions) * 100 : 0,
      ])
    ) },
    { metric: "Reach", ...Object.fromEntries(
      data.platforms.map((p) => [
        platformNames[p.platform],
        maxValues.reach ? (p.total_reach / maxValues.reach) * 100 : 0,
      ])
    ) },
    { metric: "Likes", ...Object.fromEntries(
      data.platforms.map((p) => [
        platformNames[p.platform],
        maxValues.likes ? (p.total_likes / maxValues.likes) * 100 : 0,
      ])
    ) },
    { metric: "Comments", ...Object.fromEntries(
      data.platforms.map((p) => [
        platformNames[p.platform],
        maxValues.comments ? (p.total_comments / maxValues.comments) * 100 : 0,
      ])
    ) },
    { metric: "Shares", ...Object.fromEntries(
      data.platforms.map((p) => [
        platformNames[p.platform],
        maxValues.shares ? (p.total_shares / maxValues.shares) * 100 : 0,
      ])
    ) },
    { metric: "Eng. Rate", ...Object.fromEntries(
      data.platforms.map((p) => [
        platformNames[p.platform],
        maxValues.engagement_rate ? (p.avg_engagement_rate / maxValues.engagement_rate) * 100 : 0,
      ])
    ) },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Posts</p>
            <p className="text-2xl font-bold">{totalPosts}</p>
            <p className="text-xs text-muted-foreground">
              Last {data.period_days} days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Impressions</p>
            <p className="text-2xl font-bold">{formatNumber(totalImpressions)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Engagement</p>
            <p className="text-2xl font-bold">{formatNumber(totalEngagement)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Avg Engagement Rate</p>
            <p className="text-2xl font-bold">{avgEngagementRate.toFixed(2)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {data.platforms.map((platform) => {
          const PlatformIcon = platformIcons[platform.platform];
          const color = platformColors[platform.platform];
          const platformEngagement =
            platform.total_likes + platform.total_comments + platform.total_shares;

          return (
            <Card key={platform.platform} className="overflow-hidden">
              <div className="h-1" style={{ backgroundColor: color }} />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <PlatformIcon className="h-5 w-5" style={{ color }} />
                    </div>
                    <CardTitle className="text-lg">
                      {platformNames[platform.platform]}
                    </CardTitle>
                  </div>
                  <Badge variant="secondary">{platform.post_count} posts</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      Impressions
                      {getTrendIcon(platform.total_impressions, totalImpressions / data.platforms.length)}
                    </p>
                    <p className="text-xl font-semibold">
                      {formatNumber(platform.total_impressions)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      Reach
                      {getTrendIcon(platform.total_reach, totalImpressions / data.platforms.length / 2)}
                    </p>
                    <p className="text-xl font-semibold">
                      {formatNumber(platform.total_reach)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      Engagement
                      {getTrendIcon(platformEngagement, totalEngagement / data.platforms.length)}
                    </p>
                    <p className="text-xl font-semibold">
                      {formatNumber(platformEngagement)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      Eng. Rate
                      {getTrendIcon(platform.avg_engagement_rate, avgEngagementRate)}
                    </p>
                    <p className="text-xl font-semibold">
                      {platform.avg_engagement_rate.toFixed(2)}%
                    </p>
                  </div>
                </div>

                {/* Engagement breakdown */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      ❤️ {formatNumber(platform.total_likes)}
                    </span>
                    <span className="text-muted-foreground">
                      💬 {formatNumber(platform.total_comments)}
                    </span>
                    <span className="text-muted-foreground">
                      🔄 {formatNumber(platform.total_shares)}
                    </span>
                    <span className="text-muted-foreground">
                      🖱️ {formatNumber(platform.total_clicks)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar Chart - Engagement Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement by Platform</CardTitle>
            <CardDescription>
              Likes, comments, and shares comparison
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="platform" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => formatNumber(v)} />
                <Tooltip formatter={(v: number) => formatNumber(v)} />
                <Legend />
                <Bar dataKey="Likes" fill="#ef4444" />
                <Bar dataKey="Comments" fill="#3b82f6" />
                <Bar dataKey="Shares" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Radar Chart - Overall Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Radar</CardTitle>
            <CardDescription>
              Relative performance across metrics (normalized to 100)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" fontSize={12} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={10} />
                {data.platforms.map((p) => (
                  <Radar
                    key={p.platform}
                    name={platformNames[p.platform]}
                    dataKey={platformNames[p.platform]}
                    stroke={platformColors[p.platform]}
                    fill={platformColors[p.platform]}
                    fillOpacity={0.3}
                  />
                ))}
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Impressions Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Impressions & Reach Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" fontSize={12} tickFormatter={(v) => formatNumber(v)} />
              <YAxis dataKey="platform" type="category" fontSize={12} width={80} />
              <Tooltip formatter={(v: number) => formatNumber(v)} />
              <Legend />
              <Bar dataKey="Impressions" fill="#8b5cf6" />
              <Bar dataKey="Reach" fill="#06b6d4" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
