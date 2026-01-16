/**
 * Recommendation Types - AI-powered next-best-actions
 */

// Enums
export type RecommendationType =
  | "contact_action"
  | "deal_action"
  | "follow_up"
  | "outreach"
  | "engagement"
  | "upsell"
  | "retention"
  | "prioritization";

export type RecommendationPriority = "critical" | "high" | "medium" | "low";

export type RecommendationStatus =
  | "pending"
  | "accepted"
  | "dismissed"
  | "completed"
  | "expired";

// Main types
export interface Recommendation {
  id: string;
  contact_id: string | null;
  deal_id: string | null;
  type: RecommendationType;
  priority: RecommendationPriority;
  status: RecommendationStatus;
  title: string;
  description: string;
  reasoning: string;
  suggested_action: string;
  action_template: string | null;
  confidence: number;
  impact_score: number;
  urgency_score: number;
  context_data: Record<string, unknown>;
  created_at: string;
  expires_at: string | null;
}

export interface RecommendationList {
  recommendations: Recommendation[];
  total: number;
  pending_count: number;
  high_priority_count: number;
}

export interface NextBestActions {
  contact_actions: Recommendation[];
  deal_actions: Recommendation[];
  follow_ups: Recommendation[];
  top_priorities: Recommendation[];
  generated_at: string;
}

export interface RecommendationActionRequest {
  action: "accept" | "dismiss" | "complete";
  notes?: string;
}

// Helper functions
export function getPriorityColor(priority: RecommendationPriority): string {
  switch (priority) {
    case "critical":
      return "text-red-600";
    case "high":
      return "text-orange-500";
    case "medium":
      return "text-yellow-500";
    case "low":
      return "text-gray-500";
  }
}

export function getPriorityBgColor(priority: RecommendationPriority): string {
  switch (priority) {
    case "critical":
      return "bg-red-100 text-red-800";
    case "high":
      return "bg-orange-100 text-orange-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "low":
      return "bg-gray-100 text-gray-800";
  }
}

export function getTypeIcon(type: RecommendationType): string {
  switch (type) {
    case "contact_action":
      return "user";
    case "deal_action":
      return "briefcase";
    case "follow_up":
      return "clock";
    case "outreach":
      return "send";
    case "engagement":
      return "message-circle";
    case "upsell":
      return "trending-up";
    case "retention":
      return "shield";
    case "prioritization":
      return "list";
    default:
      return "lightbulb";
  }
}

export function getTypeLabel(type: RecommendationType): string {
  switch (type) {
    case "contact_action":
      return "Contact Action";
    case "deal_action":
      return "Deal Action";
    case "follow_up":
      return "Follow Up";
    case "outreach":
      return "Outreach";
    case "engagement":
      return "Engagement";
    case "upsell":
      return "Upsell";
    case "retention":
      return "Retention";
    case "prioritization":
      return "Priority";
    default:
      return "Recommendation";
  }
}

export function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}
