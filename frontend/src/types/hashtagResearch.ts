export type HashtagCategory =
  | "general"
  | "industry"
  | "trending"
  | "branded"
  | "campaign"
  | "seasonal"
  | "niche";

export type TrendDirection = "rising" | "stable" | "declining";

export interface TrackedHashtag {
  id: string;
  owner_id: string;
  hashtag: string;
  category: HashtagCategory;
  is_active: boolean;
  notes?: string;
  total_posts: number;
  total_reach: number;
  total_engagement: number;
  avg_engagement_rate?: number;
  trend_direction: TrendDirection;
  trend_score?: number;
  times_used: number;
  last_used_at?: string;
  best_performing_platform?: string;
  created_at: string;
  updated_at: string;
}

export interface TrackedHashtagCreate {
  hashtag: string;
  category?: HashtagCategory;
  is_active?: boolean;
  notes?: string;
}

export interface HashtagPerformance {
  id: string;
  owner_id: string;
  hashtag_id: string;
  platform: string;
  post_id?: string;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagement_rate?: number;
  recorded_at: string;
  created_at: string;
}

export interface HashtagCollection {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  hashtags: string;
  is_favorite: boolean;
  times_used: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface HashtagCollectionCreate {
  name: string;
  description?: string;
  hashtags: string;
  is_favorite?: boolean;
}

export interface TrendingHashtag {
  id: string;
  hashtag: string;
  platform: string;
  category?: string;
  volume: number;
  velocity: number;
  rank: number;
  peak_time?: string;
  trend_start?: string;
  relevance_score?: number;
  discovered_at: string;
  expires_at?: string;
}

export interface HashtagStats {
  period_days: number;
  total_hashtags: number;
  total_collections: number;
  category_breakdown: Record<string, number>;
  trend_breakdown: Record<TrendDirection, number>;
  top_hashtags: Array<{
    id: string;
    hashtag: string;
    total_engagement: number;
    trend_direction: TrendDirection;
  }>;
  top_collections: Array<{
    id: string;
    name: string;
    times_used: number;
    hashtag_count: number;
  }>;
}

export interface HashtagSuggestion {
  hashtag: string;
  source: "top_performing" | "trending" | "rising";
  reason: string;
  engagement_rate?: number;
  platform?: string;
  volume?: number;
  trend_score?: number;
}

export interface PlatformBreakdown {
  platform: string;
  total_impressions: number;
  total_reach: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_saves: number;
  post_count: number;
  engagement_rate: number;
}

export interface HashtagPerformanceData {
  hashtag: TrackedHashtag;
  period_days: number;
  platform_breakdown: PlatformBreakdown[];
  timeline: Array<{
    date: string;
    impressions: number;
    engagement: number;
    posts: number;
  }>;
  total_posts: number;
}
