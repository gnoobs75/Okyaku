/**
 * Conversation Intelligence Types - Meeting summaries, call analysis
 */

// Enums
export type ConversationType =
  | "meeting"
  | "call"
  | "email_thread"
  | "chat"
  | "other";

export type SentimentType = "positive" | "neutral" | "negative" | "mixed";

// Main types
export interface ConversationAnalysis {
  id: string;
  contact_id: string | null;
  deal_id: string | null;
  activity_id: string | null;
  type: ConversationType;
  title: string;
  occurred_at: string;
  duration_minutes: number | null;
  participants: string[];
  summary: string;
  key_points: string[];
  action_items: ActionItem[];
  decisions_made: string[];
  questions_raised: string[];
  follow_up_required: boolean;
  sentiment: SentimentType;
  sentiment_score: number;
  topics: string[];
  keywords: string[];
  mentioned_people: string[];
  mentioned_companies: string[];
  created_at: string;
  analyzed_at: string;
  model_version: string;
}

export interface ActionItem {
  description: string;
  assignee: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high";
  completed: boolean;
}

export interface ConversationSummary {
  total_conversations: number;
  recent_summary: string | null;
  last_conversation: string | null;
  common_topics: string[];
  sentiment_trend: string;
  average_sentiment_score: number;
  pending_action_items: ActionItem[];
}

// Request types
export interface AnalyzeConversationRequest {
  type: ConversationType;
  title: string;
  transcript?: string;
  notes?: string;
  contact_id?: string;
  deal_id?: string;
  activity_id?: string;
  occurred_at?: string;
  duration_minutes?: number;
  participants?: string[];
}

export interface QuickSummarizeRequest {
  text: string;
  context?: string;
}

export interface QuickSummaryResponse {
  summary: string;
  key_points: string[];
  action_items: string[];
}

// Helper functions
export function getSentimentColor(sentiment: SentimentType): string {
  switch (sentiment) {
    case "positive":
      return "text-green-600";
    case "negative":
      return "text-red-600";
    case "mixed":
      return "text-yellow-600";
    default:
      return "text-gray-600";
  }
}

export function getSentimentBgColor(sentiment: SentimentType): string {
  switch (sentiment) {
    case "positive":
      return "bg-green-100 text-green-800";
    case "negative":
      return "bg-red-100 text-red-800";
    case "mixed":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function getConversationTypeLabel(type: ConversationType): string {
  switch (type) {
    case "meeting":
      return "Meeting";
    case "call":
      return "Call";
    case "email_thread":
      return "Email Thread";
    case "chat":
      return "Chat";
    default:
      return "Other";
  }
}

export function formatDuration(minutes: number | null): string {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
