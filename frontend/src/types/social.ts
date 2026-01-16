export type SocialPlatform = "linkedin" | "twitter" | "facebook";

export type AccountStatus = "connected" | "disconnected" | "token_expired" | "error";

export type PostStatus =
  | "draft"
  | "scheduled"
  | "queued"
  | "publishing"
  | "published"
  | "failed"
  | "cancelled";

export type MediaType = "image" | "video" | "gif" | "link";

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  platform_user_id: string;
  platform_username: string;
  display_name?: string;
  profile_image_url?: string;
  status: AccountStatus;
  error_message?: string;
  token_expires_at?: string;
  created_at: string;
}

export interface SocialPost {
  id: string;
  account_id: string;
  content: string;
  link_url?: string;
  link_title?: string;
  link_description?: string;
  status: PostStatus;
  scheduled_at?: string;
  published_at?: string;
  timezone: string;
  platform_post_id?: string;
  platform_post_url?: string;
  error_message?: string;
  retry_count: number;
  created_at: string;
}

export interface SocialPostWithAnalytics extends SocialPost {
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagement_rate: number;
}

export interface SocialPostCreate {
  account_id: string;
  content: string;
  link_url?: string;
  link_title?: string;
  link_description?: string;
  scheduled_at?: string;
  timezone?: string;
}

export interface MediaAttachment {
  id: string;
  post_id: string;
  media_type: MediaType;
  file_url: string;
  thumbnail_url?: string;
  alt_text?: string;
  file_size?: number;
  width?: number;
  height?: number;
  duration_seconds?: number;
  order: number;
}

export interface MediaAttachmentCreate {
  media_type: MediaType;
  file_url: string;
  thumbnail_url?: string;
  alt_text?: string;
  order?: number;
}

// Calendar event representation
export interface CalendarEvent {
  id: string;
  post: SocialPost;
  account: SocialAccount;
  date: Date;
}

// Inbox types
export type MessageType = "direct_message" | "mention" | "comment" | "reply";
export type MessageStatus = "unread" | "read" | "responded" | "archived";

export interface SocialMessage {
  id: string;
  account_id: string;
  platform: SocialPlatform;
  platform_message_id: string;
  thread_id?: string;
  message_type: MessageType;
  content: string;
  sender_platform_id: string;
  sender_username: string;
  sender_display_name?: string;
  sender_profile_image?: string;
  received_at: string;
  status: MessageStatus;
  read_at?: string;
  responded_at?: string;
  assigned_to?: string;
  contact_id?: string;
  company_id?: string;
  created_at: string;
}

export interface SocialMessageReply {
  id: string;
  message_id: string;
  content: string;
  sent_at: string;
  sent_by: string;
  platform_reply_id?: string;
  send_status: string;
  error_message?: string;
}

export interface InboxStats {
  total: number;
  unread: number;
  responded: number;
  by_platform: Record<string, number>;
  by_type: Record<string, number>;
}

// Analytics types
export interface AnalyticsOverview {
  total_posts: number;
  total_impressions: number;
  total_reach: number;
  total_engagement: number;
  avg_engagement_rate: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_clicks: number;
}

export interface PlatformAnalytics {
  platform: SocialPlatform;
  posts: number;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagement_rate: number;
}

export interface TimelineDataPoint {
  period: string;
  posts: number;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagement: number;
}

export interface TopPost {
  id: string;
  content: string;
  published_at?: string;
  platform?: SocialPlatform;
  platform_username?: string;
  platform_post_url?: string;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagement_rate: number;
  total_engagement: number;
}

export interface EngagementBreakdown {
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  saves: number;
}

export interface PostingFrequency {
  by_day_of_week: { day: string; posts: number; engagement: number }[];
  by_hour: { hour: number; posts: number; engagement: number }[];
}

export interface AccountPerformance {
  account_id: string;
  platform: SocialPlatform;
  username: string;
  display_name?: string;
  profile_image?: string;
  posts: number;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  engagement_rate: number;
}

// Best Time to Post types
export interface BestHour {
  day: number;
  day_name: string;
  hour: number;
  hour_label: string;
  avg_engagement_rate: number;
  post_count: number;
}

export interface BestDay {
  day: number;
  day_name: string;
  avg_engagement_rate: number;
  post_count: number;
}

export interface PostingRecommendation {
  day: string;
  time: string;
  engagement_rate: number;
  confidence: "high" | "medium" | "low";
}

export interface BestTimesToPost {
  best_hours: BestHour[];
  best_days: BestDay[];
  heatmap: number[][];
  recommendations: PostingRecommendation[];
  data_points: number;
  analysis_period_days: number;
}

// Content Insights types
export interface ContentLengthInsight {
  category: string;
  char_range: string;
  avg_engagement_rate: number;
  post_count: number;
}

export interface MediaImpact {
  with_media?: {
    avg_engagement_rate: number;
    post_count: number;
  };
  without_media?: {
    avg_engagement_rate: number;
    post_count: number;
  };
}

export interface HashtagInsight {
  hashtag_count: number;
  avg_engagement_rate: number;
  post_count: number;
}

export interface ContentInsights {
  content_length: ContentLengthInsight[];
  media_impact: MediaImpact;
  hashtag_performance: HashtagInsight[];
  total_posts_analyzed: number;
}

// Platform Comparison types
export interface PlatformComparison {
  platform: SocialPlatform;
  post_count: number;
  total_impressions: number;
  total_reach: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_clicks: number;
  avg_engagement_rate: number;
}

export interface PlatformComparisonResult {
  platforms: PlatformComparison[];
  period_days: number;
}

// AI Content Generation types
export type ContentTone =
  | "professional"
  | "casual"
  | "humorous"
  | "inspirational"
  | "educational"
  | "promotional";

export type ContentLength = "short" | "medium" | "long";

export interface GeneratePostRequest {
  topic: string;
  platform: SocialPlatform;
  tone?: ContentTone;
  length?: ContentLength;
  include_hashtags?: boolean;
  include_emojis?: boolean;
  include_cta?: boolean;
  additional_context?: string;
  brand_voice?: string;
}

export interface GeneratePostResponse {
  success: boolean;
  content?: string;
  platform: SocialPlatform;
  tone?: ContentTone;
  length?: ContentLength;
  char_count?: number;
  model?: string;
  error?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface GenerateVariationsRequest {
  content: string;
  platform: SocialPlatform;
  num_variations?: number;
  tone?: ContentTone;
}

export interface GenerateVariationsResponse {
  success: boolean;
  variations?: string[];
  platform: SocialPlatform;
  error?: string;
}

export interface AdaptContentRequest {
  content: string;
  source_platform: SocialPlatform;
  target_platform: SocialPlatform;
}

export interface AdaptContentResponse {
  success: boolean;
  original_content?: string;
  adapted_content?: string;
  source_platform: SocialPlatform;
  target_platform: SocialPlatform;
  char_count?: number;
  error?: string;
}

export interface ImproveContentRequest {
  content: string;
  platform: SocialPlatform;
  improvement_focus?: string;
}

export interface ImproveContentResponse {
  success: boolean;
  original_content?: string;
  improved_content?: string;
  changes?: string[];
  tips?: string[];
  platform: SocialPlatform;
  error?: string;
}

export interface GenerateHashtagsRequest {
  content: string;
  platform: SocialPlatform;
  count?: number;
}

export interface GenerateHashtagsResponse {
  success: boolean;
  hashtags?: string[];
  platform: SocialPlatform;
  error?: string;
}

export interface OllamaHealth {
  status: "healthy" | "unavailable";
  provider: string;
  base_url: string;
  available_models?: string[];
  configured_model: string;
  model_available?: boolean;
  error?: string;
}

export interface AIContentStatus {
  available: boolean;
  provider: string;
  model?: string;
  embedding_model?: string;
  base_url?: string;
  health?: OllamaHealth;
  features: {
    content_generation: boolean;
    lead_scoring: boolean;
    deal_forecasting: boolean;
    ai_chat: boolean;
    ai_agents: boolean;
    rag_search: boolean;
  };
  supported_platforms: SocialPlatform[];
  supported_tones: ContentTone[];
  supported_lengths: ContentLength[];
  setup_instructions?: {
    message: string;
    steps: string[];
  };
}
