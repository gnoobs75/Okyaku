/**
 * InsightsPanel - Display AI-generated insights and anomalies
 */

import { useState, useEffect } from "react";
import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Star,
  Shield,
  Flag,
  Bell,
  RefreshCw,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/useApi";
import type {
  Insight,
  InsightsList,
  InsightType,
  InsightSeverity,
} from "@/types/insights";
import {
  getSeverityBgColor,
  getTypeLabel,
  getCategoryLabel,
} from "@/types/insights";

interface InsightsPanelProps {
  onViewAll?: () => void;
  onInsightClick?: (insight: Insight) => void;
}

const typeIcons: Record<InsightType, React.ComponentType<{ className?: string }>> = {
  anomaly: AlertTriangle,
  trend: TrendingUp,
  opportunity: Star,
  risk: Shield,
  milestone: Flag,
  alert: Bell,
};

export function InsightsPanel({ onViewAll, onInsightClick }: InsightsPanelProps) {
  const { get, post, patch } = useApi();
  const [data, setData] = useState<InsightsList | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await get("/ai/insights?limit=10");
      if (result) {
        setData(result as InsightsList);
      }
    } catch (err) {
      setError("Failed to load insights");
      console.error("Failed to fetch insights:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    setGenerating(true);
    try {
      await post("/ai/insights/generate", {});
      await fetchInsights();
    } catch (err) {
      console.error("Failed to generate insights:", err);
    } finally {
      setGenerating(false);
    }
  };

  const acknowledgeInsight = async (insightId: string) => {
    try {
      await patch(`/ai/insights/${insightId}`, { status: "acknowledged" });
      // Remove from list
      if (data) {
        setData({
          ...data,
          insights: data.insights.filter((i) => i.id !== insightId),
          total: data.total - 1,
          new_count: Math.max(0, data.new_count - 1),
        });
      }
    } catch (err) {
      console.error("Failed to acknowledge insight:", err);
    }
  };

  const dismissInsight = async (insightId: string) => {
    try {
      await patch(`/ai/insights/${insightId}`, { status: "dismissed" });
      // Remove from list
      if (data) {
        setData({
          ...data,
          insights: data.insights.filter((i) => i.id !== insightId),
          total: data.total - 1,
        });
      }
    } catch (err) {
      console.error("Failed to dismiss insight:", err);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  if (loading && !data) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">{error}</p>
            <Button onClick={fetchInsights} size="sm" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const insights = data?.insights || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            AI Insights
            {data && data.new_count > 0 && (
              <Badge variant="destructive" className="ml-2">
                {data.new_count} new
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={generateInsights}
              disabled={generating}
              title="Run anomaly detection"
            >
              {generating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.length === 0 ? (
          <div className="text-center py-6">
            <Lightbulb className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No insights yet</p>
            <Button
              variant="outline"
              size="sm"
              onClick={generateInsights}
              disabled={generating}
              className="mt-3"
            >
              {generating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Generate Insights
                </>
              )}
            </Button>
          </div>
        ) : (
          <>
            {insights.slice(0, 5).map((insight) => {
              const TypeIcon = typeIcons[insight.type] || Lightbulb;

              return (
                <div
                  key={insight.id}
                  className="p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onInsightClick?.(insight)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        insight.severity === "critical" || insight.severity === "high"
                          ? "bg-red-100"
                          : insight.type === "opportunity"
                          ? "bg-green-100"
                          : "bg-yellow-100"
                      }`}
                    >
                      <TypeIcon
                        className={`h-4 w-4 ${
                          insight.severity === "critical" || insight.severity === "high"
                            ? "text-red-600"
                            : insight.type === "opportunity"
                            ? "text-green-600"
                            : "text-yellow-600"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">
                          {insight.title}
                        </span>
                        <Badge className={`text-xs ${getSeverityBgColor(insight.severity)}`}>
                          {insight.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {insight.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(insight.type)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getCategoryLabel(insight.category)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          acknowledgeInsight(insight.id);
                        }}
                        className="h-7 w-7 p-0"
                        title="Acknowledge"
                      >
                        <Check className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissInsight(insight.id);
                        }}
                        className="h-7 w-7 p-0"
                        title="Dismiss"
                      >
                        <X className="h-4 w-4 text-gray-400" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {onViewAll && insights.length > 5 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onViewAll}
              >
                View All Insights
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
