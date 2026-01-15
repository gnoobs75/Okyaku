export type ActivityType = "call" | "email" | "meeting" | "note" | "task" | "other";

export interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  description?: string;
  activity_date: string;
  duration_minutes?: number;
  outcome?: string;
  contact_id?: string;
  company_id?: string;
  deal_id?: string;
  owner_id?: string;
  custom_properties: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
  // With relations
  contact_name?: string;
  company_name?: string;
  deal_name?: string;
  owner_name?: string;
}

export interface ActivityCreate {
  type: ActivityType;
  subject: string;
  description?: string;
  activity_date?: string;
  duration_minutes?: number;
  outcome?: string;
  contact_id?: string;
  company_id?: string;
  deal_id?: string;
  custom_properties?: Record<string, unknown>;
}

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  due_time?: string;
  priority: TaskPriority;
  status: TaskStatus;
  completed_at?: string;
  assignee_id?: string;
  contact_id?: string;
  company_id?: string;
  deal_id?: string;
  reminder_date?: string;
  custom_properties: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
  // With relations
  assignee_name?: string;
  contact_name?: string;
  company_name?: string;
  deal_name?: string;
}

export interface TaskCreate {
  title: string;
  description?: string;
  due_date?: string;
  due_time?: string;
  priority?: TaskPriority;
  assignee_id?: string;
  contact_id?: string;
  company_id?: string;
  deal_id?: string;
  reminder_date?: string;
  custom_properties?: Record<string, unknown>;
}
