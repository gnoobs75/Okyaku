/**
 * DealForecastCard - Displays AI-generated deal forecast
 */

import { useState } from "react";
import {
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Calendar,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/useApi";
import type { DealForecast } from "@/types/ai";
import {
  getRiskLevelBgColor,
  formatProbability,
  formatCurrency,
} from "@/types/ai";

interface DealForecastCardProps {
  dealId: string;
  initialForecast?: DealForecast | null;
  onForecastUpdate?: (forecast: DealForecast) => void;
}

export function DealForecastCard({
  dealId,
  initialForecast,
  onForecastUpdate,
}: DealForecastCardProps) {
  const { post, get } = useApi();
  const [forecast, setForecast] = useState<DealForecast | null>(
    initialForecast || null
  );
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const generateForecast = async () => {
    setLoading(true);
    try {
      const result = await post(`/ai/predictions/deal-forecast/${dealId}`, {});
      if (result) {
        setForecast(result as DealForecast);
        onForecastUpdate?.(result as DealForecast);
      }
    } catch (error) {
      console.error("Failed to generate deal forecast:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshForecast = async () => {
    setLoading(true);
    try {
      const result = await get(`/ai/predictions/deal-forecast/${dealId}`);
      if (result) {
        setForecast(result as DealForecast);
      }
    } catch {
      // No existing forecast
    } finally {
      setLoading(false);
    }
  };

  if (!forecast) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            AI Deal Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Generate an AI-powered forecast to predict deal outcome and
              timing.
            </p>
            <Button onClick={generateForecast} disabled={loading} size="sm">
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Forecast
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
            <TrendingUp className="h-4 w-4 text-blue-500" />
            AI Deal Forecast
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={generateForecast}
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
        {/* Close Probability */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">
              Close Probability
            </div>
            <div className="text-3xl font-bold">
              {formatProbability(forecast.close_probability)}
            </div>
          </div>
          <Badge className={getRiskLevelBgColor(forecast.risk_level)}>
            {forecast.risk_level.toUpperCase()} RISK
          </Badge>
        </div>

        {/* Probability Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              forecast.close_probability >= 0.7
                ? "bg-green-500"
                : forecast.close_probability >= 0.4
                ? "bg-yellow-500"
                : "bg-red-500"
            }`}
            style={{ width: `${forecast.close_probability * 100}%` }}
          />
        </div>

        {/* Predicted Amount & Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Predicted Amount
            </div>
            <div className="font-medium">
              {formatCurrency(forecast.predicted_amount)}
            </div>
            <div className="text-xs text-muted-foreground">
              ({formatCurrency(forecast.amount_confidence_low)} -{" "}
              {formatCurrency(forecast.amount_confidence_high)})
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Predicted Close
            </div>
            <div className="font-medium">
              {forecast.predicted_close_date
                ? new Date(forecast.predicted_close_date).toLocaleDateString()
                : "Unknown"}
            </div>
            {forecast.days_to_close && (
              <div className="text-xs text-muted-foreground">
                ~{forecast.days_to_close} days
              </div>
            )}
          </div>
        </div>

        {/* Confidence */}
        <div className="text-xs text-muted-foreground">
          {Math.round(forecast.confidence * 100)}% confidence
        </div>

        {/* Analysis */}
        <p className="text-sm">{forecast.analysis}</p>

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
            {/* Risk Factors */}
            {forecast.risk_factors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Risk Factors
                </h4>
                <ul className="space-y-1">
                  {forecast.risk_factors.map((factor, i) => (
                    <li
                      key={i}
                      className="text-sm text-muted-foreground flex items-start gap-2"
                    >
                      <span className="text-orange-500">!</span>
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Positive Signals */}
            {forecast.positive_signals.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Positive Signals
                </h4>
                <ul className="space-y-1">
                  {forecast.positive_signals.map((signal, i) => (
                    <li
                      key={i}
                      className="text-sm text-muted-foreground flex items-start gap-2"
                    >
                      <span className="text-green-500">+</span>
                      {signal}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommended Actions */}
            {forecast.recommended_actions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  Recommended Actions
                </h4>
                <ul className="space-y-1">
                  {forecast.recommended_actions.map((action, i) => (
                    <li
                      key={i}
                      className="text-sm text-muted-foreground flex items-start gap-2"
                    >
                      <span className="text-purple-500">→</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Metadata */}
            <div className="text-xs text-muted-foreground pt-2 border-t">
              Generated {new Date(forecast.calculated_at).toLocaleString()}{" "}
              using {forecast.model_version}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
