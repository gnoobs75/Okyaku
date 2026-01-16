/**
 * LeadScoreCard - Displays AI-generated lead score for a contact
 */

import { useState } from "react";
import {
  Target,
  TrendingUp,
  RefreshCw,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/useApi";
import type { LeadScore } from "@/types/ai";
import { getScoreCategoryBgColor } from "@/types/ai";

interface LeadScoreCardProps {
  contactId: string;
  initialScore?: LeadScore | null;
  onScoreUpdate?: (score: LeadScore) => void;
}

export function LeadScoreCard({
  contactId,
  initialScore,
  onScoreUpdate,
}: LeadScoreCardProps) {
  const { post, get } = useApi();
  const [score, setScore] = useState<LeadScore | null>(initialScore || null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const generateScore = async () => {
    setLoading(true);
    try {
      const result = await post(`/ai/predictions/lead-score/${contactId}`, {});
      if (result) {
        setScore(result as LeadScore);
        onScoreUpdate?.(result as LeadScore);
      }
    } catch (error) {
      console.error("Failed to generate lead score:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshScore = async () => {
    setLoading(true);
    try {
      const result = await get(`/ai/predictions/lead-score/${contactId}`);
      if (result) {
        setScore(result as LeadScore);
      }
    } catch {
      // No existing score
    } finally {
      setLoading(false);
    }
  };

  if (!score) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-purple-500" />
            AI Lead Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Generate an AI-powered lead score to predict conversion likelihood.
            </p>
            <Button onClick={generateScore} disabled={loading} size="sm">
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Score
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-purple-500" />
            AI Lead Score
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={generateScore}
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
        {/* Score Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl font-bold">{score.score}</div>
            <div className="text-sm text-muted-foreground">/100</div>
          </div>
          <Badge className={getScoreCategoryBgColor(score.category)}>
            {score.category.toUpperCase()}
          </Badge>
        </div>

        {/* Score Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              score.score >= 80
                ? "bg-red-500"
                : score.score >= 60
                ? "bg-orange-500"
                : score.score >= 40
                ? "bg-blue-500"
                : "bg-gray-400"
            }`}
            style={{ width: `${score.score}%` }}
          />
        </div>

        {/* Confidence */}
        <div className="text-xs text-muted-foreground">
          {Math.round(score.confidence * 100)}% confidence
        </div>

        {/* Explanation */}
        <p className="text-sm">{score.explanation}</p>

        {/* Expandable Details */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="mr-2 h-4 w-4" />
              Hide Details
            </>
          ) : (
            <>
              <ChevronDown className="mr-2 h-4 w-4" />
              Show Details
            </>
          )}
        </Button>

        {expanded && (
          <div className="space-y-4 pt-2">
            {/* Factor Breakdown */}
            {Object.keys(score.factors).length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4" />
                  Score Factors
                </h4>
                <div className="space-y-2">
                  {Object.entries(score.factors).map(([factor, value]) => (
                    <div key={factor} className="flex items-center justify-between text-sm">
                      <span className="capitalize">
                        {factor.replace(/_/g, " ")}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-purple-500 h-1.5 rounded-full"
                            style={{ width: `${value}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground w-8 text-right">
                          {value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {score.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Recommendations
                </h4>
                <ul className="space-y-1">
                  {score.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-purple-500">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Metadata */}
            <div className="text-xs text-muted-foreground pt-2 border-t">
              Generated {new Date(score.calculated_at).toLocaleString()} using{" "}
              {score.model_version}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
