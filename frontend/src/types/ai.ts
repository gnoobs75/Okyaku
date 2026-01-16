/**
 * AI Feature Types - Lead scoring, deal forecasting, churn prediction
 */

// Enums
export type ScoreCategory = "hot" | "warm" | "cool" | "cold";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type PredictionStatus = "active" | "expired" | "superseded";

// Lead Score
export interface LeadScore {
  id: string;
  contact_id: string;
  score: number; // 0-100
  category: ScoreCategory;
  confidence: number; // 0.0-1.0
  factors: Record<string, number>;
  explanation: string;
  recommendations: string[];
  calculated_at: string;
  model_version: string;
}

// Deal Forecast
export interface DealForecast {
  id: string;
  deal_id: string;
  close_probability: number; // 0.0-1.0
  predicted_amount: number;
  amount_confidence_low: number;
  amount_confidence_high: number;
  predicted_close_date: string | null;
  days_to_close: number | null;
  confidence: number;
  risk_level: RiskLevel;
  risk_factors: string[];
  positive_signals: string[];
  analysis: string;
  recommended_actions: string[];
  calculated_at: string;
  model_version: string;
}

// Churn Risk
export interface ChurnRisk {
  id: string;
  contact_id: string;
  risk_score: number; // 0-100
  risk_level: RiskLevel;
  confidence: number;
  warning_signals: string[];
  factor_weights: Record<string, number>;
  analysis: string;
  retention_actions: string[];
  estimated_days_to_churn: number | null;
  calculated_at: string;
  model_version: string;
}

// Pipeline Forecast
export interface DealSummary {
  deal_id: string;
  name: string;
  value: number;
  probability: number;
}

export interface PipelineForecast {
  total_pipeline_value: number;
  weighted_pipeline_value: number;
  forecasted_revenue: number;
  forecast_confidence: number;
  deals_by_probability: {
    high: DealSummary[];
    medium: DealSummary[];
    low: DealSummary[];
  };
  total_deals: number;
  average_close_probability: number;
  risk_summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  calculated_at: string;
}

// Prediction Status
export interface PredictionsStatus {
  available: boolean;
  enabled: boolean;
  ollama_status: "healthy" | "unavailable";
  model: string;
  features: {
    lead_scoring: boolean;
    deal_forecasting: boolean;
    churn_prediction: boolean;
    pipeline_forecast: boolean;
  };
}

// Helper functions
export function getScoreCategoryColor(category: ScoreCategory): string {
  switch (category) {
    case "hot":
      return "text-red-500";
    case "warm":
      return "text-orange-500";
    case "cool":
      return "text-blue-500";
    case "cold":
      return "text-gray-500";
  }
}

export function getScoreCategoryBgColor(category: ScoreCategory): string {
  switch (category) {
    case "hot":
      return "bg-red-100 text-red-800";
    case "warm":
      return "bg-orange-100 text-orange-800";
    case "cool":
      return "bg-blue-100 text-blue-800";
    case "cold":
      return "bg-gray-100 text-gray-800";
  }
}

export function getRiskLevelColor(level: RiskLevel): string {
  switch (level) {
    case "critical":
      return "text-red-600";
    case "high":
      return "text-orange-500";
    case "medium":
      return "text-yellow-500";
    case "low":
      return "text-green-500";
  }
}

export function getRiskLevelBgColor(level: RiskLevel): string {
  switch (level) {
    case "critical":
      return "bg-red-100 text-red-800";
    case "high":
      return "bg-orange-100 text-orange-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "low":
      return "bg-green-100 text-green-800";
  }
}

export function formatProbability(probability: number): string {
  return `${Math.round(probability * 100)}%`;
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
