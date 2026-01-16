/**
 * ChurnRiskCard - Displays AI-generated churn risk assessment
 */

import { useState } from "react";
import {
  AlertTriangle,
  RefreshCw,
  Shield,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Clock,
  TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/useApi";
import type { ChurnRisk } from "@/types/ai";
import { getRiskLevelBgColor } from "@/types/ai";

interface ChurnRiskCardProps {
  contactId: string;
  initialRisk?: ChurnRisk | null;
  onRiskUpdate?: (risk: ChurnRisk) => void;
}

export function ChurnRiskCard({
  contactId,
  initialRisk,
  onRiskUpdate,
}: ChurnRiskCardProps) {
  const { post, get } = useApi();
  const [risk, setRisk] = useState<ChurnRisk | null>(initialRisk || null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const assessRisk = async () => {
    setLoading(true);
    try {
      const result = await post(`/ai/predictions/churn-risk/${contactId}`, {});
      if (result) {
        setRisk(result as ChurnRisk);
        onRiskUpdate?.(result as ChurnRisk);
      }
    } catch (error) {
      console.error("Failed to assess churn risk:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshRisk = async () => {
    setLoading(true);
    try {
      const result = await get(`/ai/predictions/churn-risk/${contactId}`);
      if (result) {
        setRisk(result as ChurnRisk);
      }
    } catch {
      // No existing assessment
    } finally {
      setLoading(false);
    }
  };

  const getRiskBarColor = (score: number) => {
    if (score >= 80) return "bg-red-500";
    if (score >= 60) return "bg-orange-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (!risk) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            AI Churn Risk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Assess churn risk to identify at-risk customers and take
              preventive action.
            </p>
            <Button onClick={assessRisk} disabled={loading} size="sm">
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Assess Risk
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
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            AI Churn Risk
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={assessRisk}
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
        {/* Risk Score Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl font-bold">{risk.risk_score}</div>
            <div className="text-sm text-muted-foreground">/100</div>
          </div>
          <Badge className={getRiskLevelBgColor(risk.risk_level)}>
            {risk.risk_level.toUpperCase()}
          </Badge>
        </div>

        {/* Risk Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${getRiskBarColor(
              risk.risk_score
            )}`}
            style={{ width: `${risk.risk_score}%` }}
          />
        </div>

        {/* Days to Churn Estimate */}
        {risk.estimated_days_to_churn && (
          <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg">
            <Clock className="h-4 w-4 text-orange-500" />
            <span className="text-sm">
              Estimated {risk.estimated_days_to_churn} days until potential
              churn
            </span>
          </div>
        )}

        {/* Confidence */}
        <div className="text-xs text-muted-foreground">
          {Math.round(risk.confidence * 100)}% confidence
        </div>

        {/* Analysis */}
        <p className="text-sm">{risk.analysis}</p>

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
            {/* Warning Signals */}
            {risk.warning_signals.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Warning Signals
                </h4>
                <ul className="space-y-1">
                  {risk.warning_signals.map((signal, i) => (
                    <li
                      key={i}
                      className="text-sm text-muted-foreground flex items-start gap-2"
                    >
                      <span className="text-red-500">!</span>
                      {signal}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Factor Weights */}
            {Object.keys(risk.factor_weights).length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4" />
                  Risk Factors
                </h4>
                <div className="space-y-2">
                  {Object.entries(risk.factor_weights).map(([factor, value]) => (
                    <div
                      key={factor}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="capitalize">
                        {factor.replace(/_/g, " ")}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-orange-500 h-1.5 rounded-full"
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

            {/* Retention Actions */}
            {risk.retention_actions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  Retention Actions
                </h4>
                <ul className="space-y-1">
                  {risk.retention_actions.map((action, i) => (
                    <li
                      key={i}
                      className="text-sm text-muted-foreground flex items-start gap-2"
                    >
                      <span className="text-green-500">→</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Metadata */}
            <div className="text-xs text-muted-foreground pt-2 border-t">
              Generated {new Date(risk.calculated_at).toLocaleString()} using{" "}
              {risk.model_version}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
