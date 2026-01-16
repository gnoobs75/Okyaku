import { useEffect } from 'react';
import { Calendar, User, Building2, Briefcase, AlertCircle, CheckCircle } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useDrillDown } from '@/hooks/useDrillDown';
import { Badge } from '@/components/ui/badge';
import { DetailSkeleton } from './LoadingSkeleton';
import type { Task } from '@/types/activities';

interface TaskDetailViewProps {
  taskId: string;
}

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateStr?: string, timeStr?: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  let formatted = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  if (timeStr) {
    formatted += ` at ${timeStr}`;
  }
  return formatted;
}

function isOverdue(dueDate?: string, status?: string): boolean {
  if (!dueDate || status === 'completed' || status === 'cancelled') return false;
  return new Date(dueDate) < new Date();
}

export function TaskDetailView({ taskId }: TaskDetailViewProps) {
  const { push } = useDrillDown();
  const { get, data: task, isLoading, error } = useApi<Task>();

  useEffect(() => {
    get(`/tasks/${taskId}`);
  }, [get, taskId]);

  if (isLoading) return <DetailSkeleton />;

  if (error) {
    return (
      <div className="text-center text-destructive py-8">
        Error loading task: {error}
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Task not found
      </div>
    );
  }

  const overdue = isOverdue(task.due_date, task.status);
  const isCompleted = task.status === 'completed';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
              isCompleted
                ? 'bg-green-100'
                : overdue
                ? 'bg-destructive/10'
                : 'bg-primary/10'
            }`}
          >
            {isCompleted ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : overdue ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : (
              <Calendar className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{task.title}</h2>
            {overdue && !isCompleted && (
              <p className="text-destructive text-sm mt-1">Overdue</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge className={statusColors[task.status] || statusColors.pending}>
            {task.status.replace('_', ' ')}
          </Badge>
          <Badge className={priorityColors[task.priority] || priorityColors.medium}>
            {task.priority} priority
          </Badge>
        </div>
      </div>

      {/* Task Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {task.due_date && (
          <div className={`flex items-center gap-2 text-sm ${overdue && !isCompleted ? 'text-destructive' : ''}`}>
            <Calendar className="h-4 w-4" />
            <span>Due: {formatDateTime(task.due_date, task.due_time)}</span>
          </div>
        )}
        {task.completed_at && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>Completed: {formatDate(task.completed_at)}</span>
          </div>
        )}
        {task.assignee_name && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>Assigned to: {task.assignee_name}</span>
          </div>
        )}
        {task.contact_name && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <button
              onClick={() => {
                if (task.contact_id) {
                  push({
                    type: 'contact-detail',
                    title: task.contact_name || 'Contact',
                    contactId: task.contact_id,
                  });
                }
              }}
              className="hover:text-primary hover:underline"
            >
              {task.contact_name}
            </button>
          </div>
        )}
        {task.company_name && (
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <button
              onClick={() => {
                if (task.company_id) {
                  push({
                    type: 'company-detail',
                    title: task.company_name || 'Company',
                    companyId: task.company_id,
                  });
                }
              }}
              className="hover:text-primary hover:underline"
            >
              {task.company_name}
            </button>
          </div>
        )}
        {task.deal_name && (
          <div className="flex items-center gap-2 text-sm">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <button
              onClick={() => {
                if (task.deal_id) {
                  push({
                    type: 'deal-detail',
                    title: task.deal_name || 'Deal',
                    dealId: task.deal_id,
                  });
                }
              }}
              className="hover:text-primary hover:underline"
            >
              {task.deal_name}
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>Created {formatDate(task.created_at)}</span>
        </div>
      </div>

      {/* Reminder */}
      {task.reminder_date && (
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <span>Reminder: {formatDate(task.reminder_date)}</span>
          </div>
        </div>
      )}

      {/* Description */}
      {task.description && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Description
          </h3>
          <p className="text-sm whitespace-pre-wrap">{task.description}</p>
        </div>
      )}
    </div>
  );
}
