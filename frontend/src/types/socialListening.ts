export type MentionSentiment = "positive" | "neutral" | "negative" | "unknown";

export type MentionSource =
  | "twitter"
  | "linkedin"
  | "facebook"
  | "instagram"
  | "news"
  | "blog"
  | "forum"
  | "other";

export type AlertPriority = "low" | "medium" | "high" | "critical";

export interface TrackedKeyword {
  id: string;
  owner_id: string;
  keyword: string;
  is_active: boolean;
  alert_on_mention: boolean;
  alert_priority: AlertPriority;
  notes?: string;
  mention_count: number;
  last_mention_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TrackedKeywordCreate {
  keyword: string;
  is_active?: boolean;
  alert_on_mention?: boolean;
  alert_priority?: AlertPriority;
  notes?: string;
}

export interface BrandMention {
  id: string;
  owner_id: string;
  keyword_id: string;
  keyword?: string;
  source: MentionSource;
  source_url?: string;
  source_post_id?: string;
  content: string;
  content_preview?: string;
  author_username?: string;
  author_display_name?: string;
  author_profile_url?: string;
  author_profile_image?: string;
  author_followers?: number;
  likes: number;
  comments: number;
  shares: number;
  reach?: number;
  sentiment: MentionSentiment;
  sentiment_score?: number;
  influence_score?: number;
  is_read: boolean;
  is_responded: boolean;
  is_flagged: boolean;
  flag_reason?: string;
  mentioned_at: string;
  created_at: string;
  updated_at: string;
}

export interface MentionAlert {
  id: string;
  owner_id: string;
  mention_id: string;
  keyword_id: string;
  priority: AlertPriority;
  title: string;
  message: string;
  is_acknowledged: boolean;
  acknowledged_at?: string;
  created_at: string;
}

export interface ListeningStats {
  period_days: number;
  total_keywords: number;
  total_mentions: number;
  unread_mentions: number;
  flagged_mentions: number;
  pending_alerts: number;
  sentiment_breakdown: Record<MentionSentiment, number>;
  source_breakdown: Record<string, number>;
  avg_sentiment_score?: number;
  top_keywords: Array<{
    id: string;
    keyword: string;
    mention_count: number;
  }>;
}

export interface MentionTimelinePoint {
  date: string;
  count: number;
  positive: number;
  neutral: number;
  negative: number;
  total_engagement: number;
}

export interface PaginatedMentions {
  items: BrandMention[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}
