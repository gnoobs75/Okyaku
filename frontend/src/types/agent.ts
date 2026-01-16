/**
 * AI Agent Types - Autonomous task execution with tool use
 */

// Enums
export type AgentTaskStatus =
  | "pending"
  | "running"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "completed"
  | "failed"
  | "cancelled";

export type AgentActionType =
  | "read_only"
  | "create"
  | "update"
  | "delete"
  | "send"
  | "bulk";

// Main types
export interface AgentTask {
  id: string;
  prompt: string;
  goal: string;
  status: AgentTaskStatus;
  steps_completed: number;
  max_steps: number;
  current_step: string | null;
  result: string | null;
  error: string | null;
  pending_action: PendingAction | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface PendingAction {
  tool_call_id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
  action_type: AgentActionType;
}

export interface AgentAction {
  id: string;
  task_id: string;
  action_type: AgentActionType;
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_output: Record<string, unknown> | null;
  requires_approval: boolean;
  approved: boolean | null;
  executed: boolean;
  execution_error: string | null;
  created_at: string;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

export interface AgentStatus {
  available: boolean;
  enabled: boolean;
  ollama_status: string;
  model: string;
  require_approval_for_writes: boolean;
  available_tools: number;
}

// Request types
export interface CreateAgentTaskRequest {
  prompt: string;
  max_steps?: number;
}

export interface ApproveActionRequest {
  approved: boolean;
  rejection_reason?: string;
}

// Helper functions
export function getStatusColor(status: AgentTaskStatus): string {
  switch (status) {
    case "completed":
      return "text-green-600";
    case "running":
      return "text-blue-600";
    case "awaiting_approval":
      return "text-yellow-600";
    case "failed":
    case "rejected":
    case "cancelled":
      return "text-red-600";
    default:
      return "text-gray-600";
  }
}

export function getStatusBgColor(status: AgentTaskStatus): string {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "running":
    case "approved":
      return "bg-blue-100 text-blue-800";
    case "awaiting_approval":
      return "bg-yellow-100 text-yellow-800";
    case "failed":
    case "rejected":
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function getActionTypeLabel(type: AgentActionType): string {
  switch (type) {
    case "read_only":
      return "Read";
    case "create":
      return "Create";
    case "update":
      return "Update";
    case "delete":
      return "Delete";
    case "send":
      return "Send";
    case "bulk":
      return "Bulk Operation";
    default:
      return "Action";
  }
}

export function getActionTypeBgColor(type: AgentActionType): string {
  switch (type) {
    case "read_only":
      return "bg-gray-100 text-gray-800";
    case "create":
      return "bg-green-100 text-green-800";
    case "update":
      return "bg-blue-100 text-blue-800";
    case "delete":
      return "bg-red-100 text-red-800";
    case "send":
      return "bg-purple-100 text-purple-800";
    case "bulk":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function formatToolName(name: string): string {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
