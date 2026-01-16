/**
 * PipelineForecastCard - Displays AI-aggregated pipeline forecast
 */

import { useState, useEffect } from "react";
import {
  BarChart3,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/useApi";
import type { PipelineForecast } from "@/types/ai";
import { formatCurrency, formatProbability } from "@/types/ai";

interface PipelineForecastCardProps {
  onRefresh?: () => void;
}

export function PipelineForecastCard({ onRefresh }: PipelineForecastCardProps) {
  const { get } = useApi();
  const [forecast, setForecast] = useState<PipelineForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await get("/ai/predictions/pipeline-forecast");
      if (result) {
        setForecast(result as PipelineForecast);
      }
    } catch (err) {
      setError("Failed to load pipeline forecast");
      console.error("Failed to fetch pipeline forecast:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, []);

  const handleRefresh = () => {
    fetchForecast();
    onRefresh?.();
  };

  if (loading && !forecast) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            AI Pipeline Forecast
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

  if (error || !forecast) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            AI Pipeline Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              {error || "No pipeline forecast available. Generate deal forecasts first."}
            </p>
            <Button onClick={handleRefresh} size="sm" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalRisks =
    forecast.risk_summary.critical +
    forecast.risk_summary.high +
    forecast.risk_summary.medium +
    forecast.risk_summary.low;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            AI Pipeline Forecast
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
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
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Total Pipeline
            </div>
            <div className="text-xl font-bold">
              {formatCurrency(forecast.total_pipeline_value)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Forecasted Revenue
            </div>
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(forecast.forecasted_revenue)}
            </div>
          </div>
        </div>

        {/* Weighted Pipeline */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-blue-700">Weighted Pipeline Value</div>
            <div className="text-lg font-semibold text-blue-700">
              {formatCurrency(forecast.weighted_pipeline_value)}
            </div>
          </div>
          <div className="text-xs text-blue-600 mt-1">
            Based on {forecast.total_deals} deals with{" "}
            {formatProbability(forecast.average_close_probability)} avg.
            probability
          </div>
        </div>

        {/* Deal Distribution */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Deals by Probability
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>High (&gt;70%)</span>
              </div>
              <Badge variant="secondary">
                {forecast.deals_by_probability.high.length} deals
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>Medium (40-70%)</span>
              </div>
              <Badge variant="secondary">
                {forecast.deals_by_probability.medium.length} deals
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Low (&lt;40%)</span>
              </div>
              <Badge variant="secondary">
                {forecast.deals_by_probability.low.length} deals
              </Badge>
            </div>
          </div>
        </div>

        {/* Risk Summary */}
        {totalRisks > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Risk Distribution
            </h4>
            <div className="flex gap-2">
              {forecast.risk_summary.critical > 0 && (
                <Badge className="bg-red-100 text-red-800">
                  {forecast.risk_summary.critical} Critical
                </Badge>
              )}
              {forecast.risk_summary.high > 0 && (
                <Badge className="bg-orange-100 text-orange-800">
                  {forecast.risk_summary.high} High
                </Badge>
              )}
              {forecast.risk_summary.medium > 0 && (
                <Badge className="bg-yellow-100 text-yellow-800">
                  {forecast.risk_summary.medium} Medium
                </Badge>
              )}
              {forecast.risk_summary.low > 0 && (
                <Badge className="bg-green-100 text-green-800">
                  {forecast.risk_summary.low} Low
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Confidence */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          Forecast confidence: {formatProbability(forecast.forecast_confidence)}{" "}
          • Generated {new Date(forecast.calculated_at).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}
