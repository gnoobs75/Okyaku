import { useCallback, useEffect, useState } from "react";
import { Clock, TrendingUp, Info, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/useApi";
import type { BestTimesToPost, ContentInsights } from "@/types/social";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getHeatmapColor(value: number, maxValue: number): string {
  if (maxValue === 0 || value === 0) return "bg-muted";
  const intensity = value / maxValue;
  if (intensity > 0.8) return "bg-green-500";
  if (intensity > 0.6) return "bg-green-400";
  if (intensity > 0.4) return "bg-green-300";
  if (intensity > 0.2) return "bg-green-200";
  return "bg-green-100";
}

function getConfidenceBadgeVariant(confidence: "high" | "medium" | "low"): "default" | "secondary" | "outline" {
  switch (confidence) {
    case "high":
      return "default";
    case "medium":
      return "secondary";
    case "low":
      return "outline";
  }
}

export function BestTimeToPost() {
  const { get } = useApi();
  const [loading, setLoading] = useState(true);
  const [bestTimes, setBestTimes] = useState<BestTimesToPost | null>(null);
  const [contentInsights, setContentInsights] = useState<ContentInsights | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [timesData, insightsData] = await Promise.all([
        get("/social/analytics/best-times?days_lookback=90"),
        get("/social/analytics/content-insights?days_lookback=30"),
      ]);

      if (timesData) setBestTimes(timesData as BestTimesToPost);
      if (insightsData) setContentInsights(insightsData as ContentInsights);
    } catch (error) {
      console.error("Failed to fetch best times data:", error);
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
            <Clock className="h-5 w-5" />
            Best Time to Post
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

  const maxHeatmapValue = bestTimes?.heatmap
    ? Math.max(...bestTimes.heatmap.flat())
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Best Times to Post
          </CardTitle>
          <CardDescription>
            Based on {bestTimes?.data_points || 0} posts over the last{" "}
            {bestTimes?.analysis_period_days || 90} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bestTimes?.recommendations && bestTimes.recommendations.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-5">
              {bestTimes.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-primary">#{index + 1}</span>
                    <Badge variant={getConfidenceBadgeVariant(rec.confidence)}>
                      {rec.confidence}
                    </Badge>
                  </div>
                  <p className="font-medium">{rec.day}</p>
                  <p className="text-lg font-semibold">{rec.time}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {rec.engagement_rate}% engagement
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Info className="h-8 w-8 mb-2" />
              <p>Not enough data for recommendations</p>
              <p className="text-sm">Publish more posts to see optimal times</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Engagement Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Heatmap</CardTitle>
          <CardDescription>
            Engagement rate by day of week and hour (darker = higher engagement)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bestTimes?.heatmap && maxHeatmapValue > 0 ? (
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Hour labels */}
                <div className="flex gap-0.5 mb-1 ml-12">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="w-6 text-xs text-center text-muted-foreground"
                    >
                      {hour % 3 === 0 ? hour : ""}
                    </div>
                  ))}
                </div>

                {/* Heatmap grid */}
                {DAYS.map((day, dayIndex) => (
                  <div key={day} className="flex items-center gap-0.5 mb-0.5">
                    <div className="w-10 text-xs font-medium text-right pr-2">
                      {day}
                    </div>
                    {HOURS.map((hour) => {
                      const value = bestTimes.heatmap[dayIndex]?.[hour] || 0;
                      return (
                        <div
                          key={hour}
                          className={`w-6 h-6 rounded-sm ${getHeatmapColor(value, maxHeatmapValue)} cursor-pointer transition-transform hover:scale-110`}
                          title={`${day} ${hour}:00 - ${value.toFixed(2)}% engagement`}
                        />
                      );
                    })}
                  </div>
                ))}

                {/* Legend */}
                <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
                  <span>Low</span>
                  <div className="flex gap-0.5">
                    <div className="w-4 h-4 rounded-sm bg-green-100" />
                    <div className="w-4 h-4 rounded-sm bg-green-200" />
                    <div className="w-4 h-4 rounded-sm bg-green-300" />
                    <div className="w-4 h-4 rounded-sm bg-green-400" />
                    <div className="w-4 h-4 rounded-sm bg-green-500" />
                  </div>
                  <span>High</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              Not enough data for heatmap
            </div>
          )}
        </CardContent>
      </Card>

      {/* Best Days */}
      {bestTimes?.best_days && bestTimes.best_days.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Best Days to Post</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-7">
              {bestTimes.best_days.map((day, index) => (
                <div
                  key={day.day}
                  className={`p-3 rounded-lg border text-center ${
                    index === 0 ? "bg-green-50 border-green-200" : ""
                  }`}
                >
                  <p className="font-medium">{day.day_name}</p>
                  <p className="text-lg font-semibold text-primary">
                    {day.avg_engagement_rate}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {day.post_count} posts
                  </p>
                  {index === 0 && (
                    <Badge variant="default" className="mt-2">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Best
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Insights */}
      {contentInsights && contentInsights.total_posts_analyzed > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Content Length Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Content Length Impact
              </CardTitle>
              <CardDescription>
                Engagement by post length ({contentInsights.total_posts_analyzed} posts analyzed)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {contentInsights.content_length.map((item) => (
                  <div
                    key={item.category}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium capitalize">{item.category.replace("_", " ")}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.char_range} characters
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">{item.avg_engagement_rate}%</p>
                      <p className="text-xs text-muted-foreground">
                        {item.post_count} posts
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Media & Hashtag Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Media & Hashtag Impact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Media Impact */}
              {contentInsights.media_impact && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Media Impact</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {contentInsights.media_impact.with_media && (
                      <div className="p-3 rounded-lg border bg-green-50 border-green-200">
                        <p className="text-sm font-medium">With Media</p>
                        <p className="text-xl font-bold text-green-700">
                          {contentInsights.media_impact.with_media.avg_engagement_rate}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {contentInsights.media_impact.with_media.post_count} posts
                        </p>
                      </div>
                    )}
                    {contentInsights.media_impact.without_media && (
                      <div className="p-3 rounded-lg border">
                        <p className="text-sm font-medium">Without Media</p>
                        <p className="text-xl font-bold">
                          {contentInsights.media_impact.without_media.avg_engagement_rate}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {contentInsights.media_impact.without_media.post_count} posts
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Hashtag Performance */}
              {contentInsights.hashtag_performance && contentInsights.hashtag_performance.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Optimal Hashtag Count</h4>
                  <div className="flex flex-wrap gap-2">
                    {contentInsights.hashtag_performance.slice(0, 6).map((item) => (
                      <div
                        key={item.hashtag_count}
                        className="px-3 py-2 rounded-lg border text-center min-w-[60px]"
                      >
                        <p className="font-semibold">{item.hashtag_count}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.avg_engagement_rate}%
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
