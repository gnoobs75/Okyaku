export interface DashboardMetrics {
  date_range: {
    from: string;
    to: string;
  };
  totals: {
    contacts: number;
    companies: number;
    deals: number;
    pipeline_value: number;
  };
  contacts_by_status: Record<string, number>;
  period_metrics: {
    new_contacts: number;
    closed_deals_count: number;
    closed_deals_value: number;
    activities_count: number;
  };
  tasks: {
    open: number;
    overdue: number;
  };
  conversion_rate: number;
}

export interface PipelineFunnelStage {
  stage_id: string;
  stage_name: string;
  deal_count: number;
  deal_value: number;
  probability: number;
  weighted_value: number;
}

export interface PipelineFunnel {
  pipeline: {
    id: string;
    name: string;
  } | null;
  stages: PipelineFunnelStage[];
  total_value: number;
  weighted_total: number;
}

export interface ForecastMonth {
  month: string;
  month_label: string;
  expected_count: number;
  expected_value: number;
  closed_count: number;
  closed_value: number;
}

export interface DealForecast {
  forecast: ForecastMonth[];
}

export interface LeaderboardEntry {
  user_id: string;
  user_name: string;
  activity_count: number;
}

export interface ActivityLeaderboard {
  date_range: {
    from: string;
    to: string;
  };
  leaderboard: LeaderboardEntry[];
}

export interface RecentActivity {
  id: string;
  type: string;
  subject: string;
  activity_date: string;
  contact_id: string | null;
  deal_id: string | null;
}

export interface UpcomingTask {
  id: string;
  title: string;
  priority: string;
  due_date: string | null;
  contact_id: string | null;
  deal_id: string | null;
}
