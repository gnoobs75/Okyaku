/**
 * NextBestActionsPanel - Dashboard panel showing AI-prioritized actions
 */

import { useState, useEffect } from "react";
import {
  Sparkles,
  RefreshCw,
  User,
  Briefcase,
  Clock,
  Target,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/useApi";
import { RecommendationCard } from "./RecommendationCard";
import type { NextBestActions, Recommendation } from "@/types/recommendations";
import { getPriorityBgColor } from "@/types/recommendations";

interface NextBestActionsPanelProps {
  onViewAll?: () => void;
}

export function NextBestActionsPanel({ onViewAll }: NextBestActionsPanelProps) {
  const { get } = useApi();
  const [data, setData] = useState<NextBestActions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"priorities" | "contacts" | "deals" | "followups">(
    "priorities"
  );

  const fetchActions = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await get("/ai/recommendations/next-best-actions?limit=5");
      if (result) {
        setData(result as NextBestActions);
      }
    } catch (err) {
      setError("Failed to load recommendations");
      console.error("Failed to fetch next best actions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
  }, []);

  const handleAction = (id: string, action: string) => {
    // Remove the recommendation from the list after action
    if (data) {
      setData({
        ...data,
        top_priorities: data.top_priorities.filter((r) => r.id !== id),
        contact_actions: data.contact_actions.filter((r) => r.id !== id),
        deal_actions: data.deal_actions.filter((r) => r.id !== id),
        follow_ups: data.follow_ups.filter((r) => r.id !== id),
      });
    }
  };

  const getActiveRecommendations = (): Recommendation[] => {
    if (!data) return [];
    switch (activeTab) {
      case "priorities":
        return data.top_priorities;
      case "contacts":
        return data.contact_actions;
      case "deals":
        return data.deal_actions;
      case "followups":
        return data.follow_ups;
      default:
        return data.top_priorities;
    }
  };

  const tabs = [
    {
      key: "priorities" as const,
      label: "Top Priorities",
      icon: Target,
      count: data?.top_priorities.length || 0,
    },
    {
      key: "contacts" as const,
      label: "Contact Actions",
      icon: User,
      count: data?.contact_actions.length || 0,
    },
    {
      key: "deals" as const,
      label: "Deal Actions",
      icon: Briefcase,
      count: data?.deal_actions.length || 0,
    },
    {
      key: "followups" as const,
      label: "Follow-ups",
      icon: Clock,
      count: data?.follow_ups.length || 0,
    },
  ];

  if (loading && !data) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            AI Next Best Actions
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
            <Sparkles className="h-4 w-4 text-purple-500" />
            AI Next Best Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">{error}</p>
            <Button onClick={fetchActions} size="sm" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const recommendations = getActiveRecommendations();
  const totalCount =
    (data?.top_priorities.length || 0) +
    (data?.contact_actions.length || 0) +
    (data?.deal_actions.length || 0) +
    (data?.follow_ups.length || 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            AI Next Best Actions
            {totalCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {totalCount}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchActions}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab.key)}
                className="whitespace-nowrap"
              >
                <Icon className="h-4 w-4 mr-1" />
                {tab.label}
                {tab.count > 0 && (
                  <Badge
                    variant={activeTab === tab.key ? "secondary" : "outline"}
                    className="ml-1"
                  >
                    {tab.count}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>

        {/* Recommendations List */}
        {recommendations.length === 0 ? (
          <div className="text-center py-6">
            <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No recommendations in this category.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Generate recommendations for contacts or deals to see them here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.slice(0, 5).map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onAction={handleAction}
                compact
              />
            ))}
          </div>
        )}

        {/* View All */}
        {onViewAll && totalCount > 5 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onViewAll}
          >
            View All Recommendations
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}

        {/* Generated At */}
        {data && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Last updated {new Date(data.generated_at).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
