import { useCallback, useEffect, useState } from "react";
import { Plus, Check, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TutorialPanel } from "@/components/tutorial";
import { useApi } from "@/hooks/useApi";
import { useTutorial } from "@/context/TutorialContext";
import { getTutorialForStage } from "@/content/tutorials";
import { TaskFormModal } from "./TaskFormModal";
import type { Task, TaskStatus, TaskPriority } from "@/types/activities";
import type { PaginatedResponse } from "@/types/crm";

const statusColors: Record<TaskStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const priorityColors: Record<TaskPriority, string> = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

export function TasksPage() {
  const { tutorialMode } = useTutorial();
  const tutorial = getTutorialForStage("tasks");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const { get, isLoading } = useApi<PaginatedResponse<Task>>();
  const { post: completeTask } = useApi<Task>();

  const loadTasks = useCallback(async () => {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: "20",
      sort_by: "due_date",
      sort_order: "asc",
    });
    if (statusFilter) {
      params.set("task_status", statusFilter);
    }
    if (priorityFilter) {
      params.set("priority", priorityFilter);
    }
    const result = await get(`/tasks?${params}`);
    if (result) {
      setTasks(result.items);
      setTotal(result.total);
    }
  }, [get, page, statusFilter, priorityFilter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleComplete = async (taskId: string) => {
    await completeTask(`/tasks/${taskId}/complete`, {});
    loadTasks();
  };

  const handleTaskSaved = () => {
    setShowTaskModal(false);
    setEditingTask(null);
    loadTasks();
  };

  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === "completed" || task.status === "cancelled") {
      return false;
    }
    return new Date(task.due_date) < new Date();
  };

  return (
    <div className="space-y-6">
      {tutorialMode && tutorial && (
        <TutorialPanel tutorial={tutorial} stageId="tasks" />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">Manage your tasks and follow-ups</p>
        </div>
        <Button onClick={() => setShowTaskModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="w-40"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>

        <Select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value);
            setPage(1);
          }}
          className="w-40"
        >
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </Select>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No tasks found</p>
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => (
            <Card
              key={task.id}
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                isOverdue(task) ? "border-red-200" : ""
              }`}
              onClick={() => {
                setEditingTask(task);
                setShowTaskModal(true);
              }}
            >
              <CardContent className="flex items-center gap-4 py-4">
                {task.status !== "completed" && task.status !== "cancelled" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleComplete(task.id);
                    }}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`font-medium ${
                        task.status === "completed" ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {task.title}
                    </h3>
                    {isOverdue(task) && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  {task.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {task.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {task.contact_name && (
                      <span className="text-xs text-muted-foreground">
                        Contact: {task.contact_name}
                      </span>
                    )}
                    {task.deal_name && (
                      <span className="text-xs text-muted-foreground">
                        Deal: {task.deal_name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {task.due_date && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {new Date(task.due_date).toLocaleDateString()}
                    </div>
                  )}
                  <Badge className={priorityColors[task.priority]}>
                    {task.priority}
                  </Badge>
                  <Badge className={statusColors[task.status]}>
                    {task.status.replace("_", " ")}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} tasks
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 20 >= total}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {showTaskModal && (
        <TaskFormModal
          task={editingTask}
          onClose={() => {
            setShowTaskModal(false);
            setEditingTask(null);
          }}
          onSaved={handleTaskSaved}
        />
      )}
    </div>
  );
}
