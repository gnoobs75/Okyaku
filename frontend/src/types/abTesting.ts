export type TestStatus =
  | "draft"
  | "scheduled"
  | "running"
  | "paused"
  | "completed"
  | "cancelled";

export type TestType = "content" | "timing" | "hashtags" | "media" | "cta";

export type WinnerCriteria =
  | "engagement_rate"
  | "likes"
  | "comments"
  | "shares"
  | "clicks"
  | "reach"
  | "impressions";

export interface ABTest {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  test_type: TestType;
  platform: string;
  account_id?: string;
  winner_criteria: WinnerCriteria;
  confidence_level: number;
  min_sample_size: number;
  auto_select_winner: boolean;
  scheduled_start?: string;
  scheduled_end?: string;
  duration_hours: number;
  status: TestStatus;
  winning_variant_id?: string;
  result_summary?: string;
  statistical_significance?: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ABTestCreate {
  name: string;
  description?: string;
  test_type: TestType;
  platform: string;
  account_id?: string;
  winner_criteria?: WinnerCriteria;
  confidence_level?: number;
  min_sample_size?: number;
  auto_select_winner?: boolean;
  scheduled_start?: string;
  scheduled_end?: string;
  duration_hours?: number;
}

export interface TestVariant {
  id: string;
  owner_id: string;
  test_id: string;
  name: string;
  is_control: boolean;
  content: string;
  media_urls?: string;
  hashtags?: string;
  cta_text?: string;
  cta_url?: string;
  scheduled_time?: string;
  traffic_percentage: number;
  post_id?: string;
  published_at?: string;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagement_rate?: number;
  is_winner: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestVariantCreate {
  test_id: string;
  name: string;
  is_control?: boolean;
  content: string;
  media_urls?: string;
  hashtags?: string;
  cta_text?: string;
  cta_url?: string;
  scheduled_time?: string;
  traffic_percentage?: number;
}

export interface ABTestStats {
  total_tests: number;
  running_tests: number;
  completed_tests: number;
  draft_tests: number;
  avg_improvement: number;
  recent_tests: Array<{
    id: string;
    name: string;
    platform: string;
    completed_at?: string;
    has_winner: boolean;
  }>;
}

export interface VariantResult {
  variant: TestVariant;
  metrics: {
    impressions: number;
    reach: number;
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
    engagement_rate?: number;
  };
  share_of_impressions: number;
  lift_vs_control?: number;
  is_winner: boolean;
}

export interface TestResults {
  test: ABTest;
  summary: {
    total_impressions: number;
    total_engagement: number;
    duration_hours: number;
    statistical_significance?: number;
  };
  variants: VariantResult[];
  timeline: Record<
    string,
    Array<{
      recorded_at: string;
      impressions: number;
      engagement_rate?: number;
      confidence?: number;
    }>
  >;
}
