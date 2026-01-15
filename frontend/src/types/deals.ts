export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  probability: number;
  is_won: boolean;
  is_lost: boolean;
  pipeline_id: string;
  created_at: string;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  is_default: boolean;
  is_active: boolean;
  stages: PipelineStage[];
  created_at: string;
  updated_at?: string;
}

export interface Deal {
  id: string;
  name: string;
  value: number;
  currency: string;
  pipeline_id: string;
  stage_id: string;
  contact_id?: string;
  company_id?: string;
  owner_id?: string;
  expected_close_date?: string;
  actual_close_date?: string;
  description?: string;
  priority?: string;
  source?: string;
  lost_reason?: string;
  custom_properties: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
  // With relations
  stage_name?: string;
  pipeline_name?: string;
  contact_name?: string;
  company_name?: string;
  owner_name?: string;
}

export interface DealCreate {
  name: string;
  value?: number;
  currency?: string;
  pipeline_id: string;
  stage_id: string;
  expected_close_date?: string;
  contact_id?: string;
  company_id?: string;
  description?: string;
  priority?: string;
  source?: string;
  custom_properties?: Record<string, unknown>;
}

export interface DealForecast {
  total_value: number;
  weighted_value: number;
  by_stage: {
    stage_name: string;
    deal_count: number;
    total_value: number;
    probability: number;
  }[];
}
