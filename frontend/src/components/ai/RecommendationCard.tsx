/**
 * RecommendationCard - Displays a single AI recommendation
 */

import { useState } from "react";
import {
  Lightbulb,
  User,
  Briefcase,
  Clock,
  Send,
  MessageCircle,
  TrendingUp,
  Shield,
  List,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/useApi";
import type { Recommendation, RecommendationType } from "@/types/recommendations";
import {
  getPriorityBgColor,
  getTypeLabel,
  formatScore,
} from "@/types/recommendations";

interface RecommendationCardProps {
  recommendation: Recommendation;
  onAction?: (id: string, action: "accept" | "dismiss" | "complete") => void;
  compact?: boolean;
}

const typeIcons: Record<RecommendationType, React.ComponentType<{ className?: string }>> = {
  contact_action: User,
  deal_action: Briefcase,
  follow_up: Clock,
  outreach: Send,
  engagement: MessageCircle,
  upsell: TrendingUp,
  retention: Shield,
  prioritization: List,
};

export function RecommendationCard({
  recommendation,
  onAction,
  compact = false,
}: RecommendationCardProps) {
  const { post } = useApi();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const TypeIcon = typeIcons[recommendation.type] || Lightbulb;

  const handleAction = async (action: "accept" | "dismiss" | "complete") => {
    setLoading(true);
    try {
      await post(`/ai/recommendations/${recommendation.id}/action`, { action });
      onAction?.(recommendation.id, action);
    } catch (error) {
      console.error("Failed to act on recommendation:", error);
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <div className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <TypeIcon className="h-4 w-4 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm truncate">
                {recommendation.title}
              </span>
              <Badge className={`text-xs ${getPriorityBgColor(recommendation.priority)}`}>
                {recommendation.priority}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {recommendation.suggested_action}
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAction("complete")}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <Check className="h-4 w-4 text-green-500" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAction("dismiss")}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <TypeIcon className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium">{recommendation.title}</span>
              <Badge className={getPriorityBgColor(recommendation.priority)}>
                {recommendation.priority.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {getTypeLabel(recommendation.type)}
              </Badge>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground mb-3">
              {recommendation.description}
            </p>

            {/* Suggested Action */}
            <div className="p-3 bg-blue-50 rounded-lg mb-3">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-700 mb-1">
                <Sparkles className="h-4 w-4" />
                Suggested Action
              </div>
              <p className="text-sm text-blue-800">
                {recommendation.suggested_action}
              </p>
            </div>

            {/* Scores */}
            <div className="flex gap-4 mb-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Target className="h-3 w-3" />
                Impact: {formatScore(recommendation.impact_score)}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Zap className="h-3 w-3" />
                Urgency: {formatScore(recommendation.urgency_score)}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                Confidence: {formatScore(recommendation.confidence)}
              </div>
            </div>

            {/* Expand/Collapse */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="w-full"
            >
              {expanded ? (
                <>
                  <ChevronUp className="mr-2 h-4 w-4" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="mr-2 h-4 w-4" />
                  Show Reasoning
                </>
              )}
            </Button>

            {expanded && (
              <div className="mt-3 pt-3 border-t space-y-3">
                {/* Reasoning */}
                <div>
                  <h4 className="text-sm font-medium mb-1">Why This Recommendation?</h4>
                  <p className="text-sm text-muted-foreground">
                    {recommendation.reasoning}
                  </p>
                </div>

                {/* Action Template */}
                {recommendation.action_template && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Message Template</h4>
                    <div className="p-2 bg-gray-50 rounded text-sm whitespace-pre-wrap">
                      {recommendation.action_template}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="text-xs text-muted-foreground">
                  Generated {new Date(recommendation.created_at).toLocaleString()}
                  {recommendation.expires_at && (
                    <> • Expires {new Date(recommendation.expires_at).toLocaleString()}</>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 mt-3 pt-3 border-t">
              <Button
                variant="default"
                size="sm"
                onClick={() => handleAction("complete")}
                disabled={loading}
                className="flex-1"
              >
                <Check className="mr-2 h-4 w-4" />
                Mark Complete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction("accept")}
                disabled={loading}
              >
                Accept
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAction("dismiss")}
                disabled={loading}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
