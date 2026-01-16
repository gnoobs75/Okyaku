export type CompetitorStatus = "active" | "paused" | "archived";
export type MetricTrend = "up" | "down" | "stable";

export interface Competitor {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  website_url?: string;
  logo_url?: string;
  industry?: string;
  status: CompetitorStatus;
  notes?: string;
  twitter_handle?: string;
  linkedin_url?: string;
  facebook_url?: string;
  instagram_handle?: string;
  total_followers: number;
  follower_growth_rate?: number;
  avg_engagement_rate?: number;
  posting_frequency?: number;
  avg_likes_per_post?: number;
  avg_comments_per_post?: number;
  last_analyzed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CompetitorCreate {
  name: string;
  description?: string;
  website_url?: string;
  logo_url?: string;
  industry?: string;
  notes?: string;
  twitter_handle?: string;
  linkedin_url?: string;
  facebook_url?: string;
  instagram_handle?: string;
}

export interface CompetitorMetrics {
  id: string;
  owner_id: string;
  competitor_id: string;
  platform: string;
  followers: number;
  follower_change: number;
  follower_growth_rate?: number;
  total_posts: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  engagement_rate?: number;
  posts_this_period: number;
  avg_likes?: number;
  avg_comments?: number;
  top_post_likes: number;
  recorded_at: string;
  created_at: string;
}

export interface CompetitorContent {
  id: string;
  owner_id: string;
  competitor_id: string;
  platform: string;
  post_id?: string;
  post_url?: string;
  content: string;
  content_type: string;
  hashtags?: string;
  likes: number;
  comments: number;
  shares: number;
  views?: number;
  engagement_rate?: number;
  posted_at: string;
  is_top_performer: boolean;
  notes?: string;
  created_at: string;
}

export interface CompetitiveInsight {
  id: string;
  owner_id: string;
  competitor_id?: string;
  insight_type: "gap" | "opportunity" | "threat" | "trend";
  category: "content" | "engagement" | "growth" | "timing";
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  actionable: boolean;
  is_read: boolean;
  is_actioned: boolean;
  actioned_at?: string;
  generated_at: string;
  expires_at?: string;
}

export interface CompetitorStats {
  total_competitors: number;
  pending_insights: number;
  combined_followers: number;
  avg_engagement_rate: number;
  avg_posting_frequency: number;
  top_by_engagement?: {
    id: string;
    name: string;
    engagement_rate: number;
  };
  top_by_followers?: {
    id: string;
    name: string;
    followers: number;
  };
  industry_breakdown: Record<string, number>;
}

export interface CompetitorComparison {
  competitors: Array<{
    id: string;
    name: string;
    logo_url?: string;
  }>;
  metrics: {
    followers: Array<{ name: string; value: number }>;
    engagement_rate: Array<{ name: string; value: number }>;
    posting_frequency: Array<{ name: string; value: number }>;
    avg_likes: Array<{ name: string; value: number }>;
  };
}

export interface PlatformMetricsData {
  date: string;
  followers: number;
  follower_change: number;
  engagement_rate?: number;
  posts: number;
  avg_likes?: number;
  avg_comments?: number;
}
