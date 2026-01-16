/**
 * AI Insights Types - Anomaly detection and alerts
 */

// Enums
export type InsightType =
  | "anomaly"
  | "trend"
  | "opportunity"
  | "risk"
  | "milestone"
  | "alert";

export type InsightSeverity = "info" | "low" | "medium" | "high" | "critical";

export type InsightStatus =
  | "new"
  | "viewed"
  | "acknowledged"
  | "dismissed"
  | "resolved";

export type InsightCategory =
  | "deal_velocity"
  | "pipeline_health"
  | "contact_engagement"
  | "churn_risk"
  | "revenue"
  | "activity"
  | "conversion"
  | "performance";

// Main types
export interface Insight {
  id: string;
  type: InsightType;
  category: InsightCategory;
  severity: InsightSeverity;
  status: InsightStatus;
  title: string;
  description: string;
  details: Record<string, unknown>;
  contact_id: string | null;
  deal_id: string | null;
  company_id: string | null;
  metric_name: string | null;
  metric_value: number | null;
  metric_baseline: number | null;
  deviation_percent: number | null;
  suggested_action: string | null;
  confidence: number;
  detected_at: string;
}

export interface InsightsList {
  insights: Insight[];
  total: number;
  new_count: number;
  critical_count: number;
}

export interface InsightsSummary {
  total_insights: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
  by_category: Record<string, number>;
  new_insights: number;
  critical_insights: number;
  recent_insights: Insight[];
}

// Helper functions
export function getSeverityColor(severity: InsightSeverity): string {
  switch (severity) {
    case "critical":
      return "text-red-600";
    case "high":
      return "text-orange-500";
    case "medium":
      return "text-yellow-500";
    case "low":
      return "text-blue-500";
    default:
      return "text-gray-500";
  }
}

export function getSeverityBgColor(severity: InsightSeverity): string {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-800";
    case "high":
      return "bg-orange-100 text-orange-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "low":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function getTypeIcon(type: InsightType): string {
  switch (type) {
    case "anomaly":
      return "alert-triangle";
    case "trend":
      return "trending-up";
    case "opportunity":
      return "star";
    case "risk":
      return "shield-alert";
    case "milestone":
      return "flag";
    case "alert":
      return "bell";
    default:
      return "info";
  }
}

export function getTypeLabel(type: InsightType): string {
  switch (type) {
    case "anomaly":
      return "Anomaly";
    case "trend":
      return "Trend";
    case "opportunity":
      return "Opportunity";
    case "risk":
      return "Risk";
    case "milestone":
      return "Milestone";
    case "alert":
      return "Alert";
    default:
      return "Insight";
  }
}

export function getCategoryLabel(category: InsightCategory): string {
  const labels: Record<InsightCategory, string> = {
    deal_velocity: "Deal Velocity",
    pipeline_health: "Pipeline Health",
    contact_engagement: "Engagement",
    churn_risk: "Churn Risk",
    revenue: "Revenue",
    activity: "Activity",
    conversion: "Conversion",
    performance: "Performance",
  };
  return labels[category] || category;
}
