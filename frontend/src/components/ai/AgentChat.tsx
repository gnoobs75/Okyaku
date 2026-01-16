/**
 * AgentChat - Interactive chat interface for AI Agent
 */

import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  PlayCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/useApi";
import type {
  AgentTask,
  AgentStatus,
  PendingAction,
} from "@/types/agent";
import {
  getStatusBgColor,
  getActionTypeBgColor,
  getActionTypeLabel,
  formatToolName,
} from "@/types/agent";

interface AgentChatProps {
  onTaskComplete?: (task: AgentTask) => void;
}

export function AgentChat({ onTaskComplete }: AgentChatProps) {
  const { get, post } = useApi();
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [task, setTask] = useState<AgentTask | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch agent status on mount
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const result = await get("/ai/agent/status");
      if (result) {
        setStatus(result as AgentStatus);
      }
    } catch (error) {
      console.error("Failed to fetch agent status:", error);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;

    setLoading(true);
    try {
      // Create task
      const createResult = await post("/ai/agent/tasks", {
        prompt: input.trim(),
        max_steps: 10,
      });

      if (createResult) {
        const newTask = createResult as AgentTask;
        setTask(newTask);
        setInput("");

        // Start running the task
        const runResult = await post(`/ai/agent/tasks/${newTask.id}/run`, {});
        if (runResult) {
          setTask(runResult as AgentTask);
          if ((runResult as AgentTask).status === "completed") {
            onTaskComplete?.(runResult as AgentTask);
          }
        }
      }
    } catch (error) {
      console.error("Failed to run agent task:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approved: boolean, reason?: string) => {
    if (!task) return;

    setLoading(true);
    try {
      const result = await post(`/ai/agent/tasks/${task.id}/approve`, {
        approved,
        rejection_reason: reason,
      });
      if (result) {
        setTask(result as AgentTask);
        if ((result as AgentTask).status === "completed") {
          onTaskComplete?.(result as AgentTask);
        }
      }
    } catch (error) {
      console.error("Failed to approve action:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!task) return;

    setLoading(true);
    try {
      const result = await post(`/ai/agent/tasks/${task.id}/cancel`, {});
      if (result) {
        setTask(result as AgentTask);
      }
    } catch (error) {
      console.error("Failed to cancel task:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewTask = () => {
    setTask(null);
    setInput("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Render pending action approval UI
  const renderPendingAction = (action: PendingAction) => (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-yellow-600" />
        <span className="font-medium">Action Requires Approval</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className={getActionTypeBgColor(action.action_type)}>
            {getActionTypeLabel(action.action_type)}
          </Badge>
          <span className="font-medium">{formatToolName(action.tool_name)}</span>
        </div>

        <div className="p-3 bg-white rounded border">
          <div className="text-sm font-medium mb-1">Parameters:</div>
          <pre className="text-xs text-gray-600 overflow-x-auto">
            {JSON.stringify(action.tool_input, null, 2)}
          </pre>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => handleApprove(true)}
          disabled={loading}
          className="flex-1"
        >
          <Check className="mr-2 h-4 w-4" />
          Approve
        </Button>
        <Button
          variant="outline"
          onClick={() => handleApprove(false, "Rejected by user")}
          disabled={loading}
        >
          <X className="mr-2 h-4 w-4" />
          Reject
        </Button>
      </div>
    </div>
  );

  // Render task status
  const renderTaskStatus = () => {
    if (!task) return null;

    return (
      <div className="space-y-4">
        {/* Task Info */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <Badge className={getStatusBgColor(task.status)}>
              {task.status.replace("_", " ").toUpperCase()}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Steps: {task.steps_completed}/{task.max_steps}
            </span>
          </div>

          <p className="text-sm mb-2">{task.prompt}</p>

          {task.current_step && task.status === "running" && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              {task.current_step}
            </div>
          )}

          {task.result && (
            <div className="mt-3 p-3 bg-white rounded border">
              <div className="text-sm font-medium mb-1">Result:</div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {task.result}
              </p>
            </div>
          )}

          {task.error && (
            <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
              <div className="text-sm font-medium text-red-700 mb-1">Error:</div>
              <p className="text-sm text-red-600">{task.error}</p>
            </div>
          )}
        </div>

        {/* Pending Action */}
        {task.status === "awaiting_approval" && task.pending_action && (
          renderPendingAction(task.pending_action)
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {task.status === "running" && (
            <Button variant="outline" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
          )}
          {["completed", "failed", "rejected", "cancelled"].includes(task.status) && (
            <Button onClick={handleNewTask}>
              <Sparkles className="mr-2 h-4 w-4" />
              New Task
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (!status?.available) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bot className="h-4 w-4 text-purple-500" />
            AI Agent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Bot className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              AI Agent is not available
            </p>
            <p className="text-xs text-muted-foreground">
              {!status?.enabled
                ? "Enable AI_AGENTS_ENABLED in settings"
                : "Check Ollama connection"}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStatus}
              className="mt-3"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bot className="h-4 w-4 text-purple-500" />
            AI Agent
            <Badge variant="secondary" className="ml-2">
              {status.available_tools} tools
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        {showDetails && (
          <div className="text-xs text-muted-foreground mt-2 space-y-1">
            <div>Model: {status.model}</div>
            <div>
              Approval required for writes:{" "}
              {status.require_approval_for_writes ? "Yes" : "No"}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {task ? (
          renderTaskStatus()
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Ask the AI agent to help with CRM tasks. It can search, create, and
              update contacts, deals, and activities.
            </p>

            <div className="space-y-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., Find all deals over $10,000 and create follow-up tasks for each..."
                className="w-full p-3 border rounded-lg resize-none text-sm min-h-[80px]"
                disabled={loading}
              />

              <Button
                onClick={handleSubmit}
                disabled={!input.trim() || loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Run Agent Task
                  </>
                )}
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              <div className="font-medium mb-1">Example tasks:</div>
              <ul className="space-y-1">
                <li
                  className="cursor-pointer hover:text-foreground"
                  onClick={() =>
                    setInput("Search for contacts at Acme Corp and show their recent activities")
                  }
                >
                  • Search for contacts at Acme Corp
                </li>
                <li
                  className="cursor-pointer hover:text-foreground"
                  onClick={() =>
                    setInput("Create a follow-up task for all deals closing this month")
                  }
                >
                  • Create tasks for deals closing this month
                </li>
                <li
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => setInput("Give me a summary of the sales pipeline")}
                >
                  • Summarize the sales pipeline
                </li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
