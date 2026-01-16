export type RuleStatus = "active" | "paused" | "archived";

export type TriggerType =
  | "new_follower"
  | "new_mention"
  | "new_comment"
  | "new_dm"
  | "keyword_match"
  | "sentiment"
  | "high_engagement";

export type ActionType =
  | "send_dm"
  | "reply_comment"
  | "like_post"
  | "follow_back"
  | "add_to_list"
  | "create_task"
  | "send_notification"
  | "webhook";

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "greater_than"
  | "less_than"
  | "in"
  | "not_in";

export interface AutomationRule {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  trigger_type: TriggerType;
  action_type: ActionType;
  platform?: string;
  account_id?: string;
  status: RuleStatus;
  cooldown_minutes: number;
  daily_limit: number;
  enabled_hours_start: number;
  enabled_hours_end: number;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  last_executed_at?: string;
  executions_today: number;
  created_at: string;
  updated_at: string;
}

export interface AutomationRuleCreate {
  name: string;
  description?: string;
  trigger_type: TriggerType;
  action_type: ActionType;
  platform?: string;
  account_id?: string;
  cooldown_minutes?: number;
  daily_limit?: number;
  enabled_hours_start?: number;
  enabled_hours_end?: number;
}

export interface RuleCondition {
  id: string;
  owner_id: string;
  rule_id: string;
  field: string;
  operator: ConditionOperator;
  value: string;
  is_required: boolean;
  created_at: string;
}

export interface RuleConditionCreate {
  rule_id: string;
  field: string;
  operator: ConditionOperator;
  value: string;
  is_required?: boolean;
}

export interface RuleAction {
  id: string;
  owner_id: string;
  rule_id: string;
  action_type: ActionType;
  delay_minutes: number;
  message_template?: string;
  list_name?: string;
  webhook_url?: string;
  task_title?: string;
  task_priority?: string;
  created_at: string;
}

export interface RuleActionCreate {
  rule_id: string;
  action_type: ActionType;
  delay_minutes?: number;
  message_template?: string;
  list_name?: string;
  webhook_url?: string;
  task_title?: string;
  task_priority?: string;
}

export interface ExecutionLog {
  id: string;
  owner_id: string;
  rule_id: string;
  trigger_data: string;
  action_taken: string;
  success: boolean;
  error_message?: string;
  executed_at: string;
}

export interface ResponseTemplate {
  id: string;
  owner_id: string;
  name: string;
  category: string;
  content: string;
  platform?: string;
  is_default: boolean;
  variables?: string;
  times_used: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ResponseTemplateCreate {
  name: string;
  category: string;
  content: string;
  platform?: string;
  is_default?: boolean;
  variables?: string;
}

export interface AutomationStats {
  total_rules: number;
  active_rules: number;
  total_templates: number;
  executions_30d: number;
  successful_executions_30d: number;
  success_rate: number;
  daily_executions: Array<{
    date: string;
    total: number;
    successful: number;
  }>;
  trigger_breakdown: Record<string, number>;
  top_rules: Array<{
    id: string;
    name: string;
    trigger_type: TriggerType;
    successful_executions: number;
    status: RuleStatus;
  }>;
}
