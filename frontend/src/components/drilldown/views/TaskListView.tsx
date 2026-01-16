import { useEffect } from 'react';
import { CheckSquare, Calendar, User, AlertCircle } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useDrillDown } from '@/hooks/useDrillDown';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from './LoadingSkeleton';
import type { Task } from '@/types/activities';
import type { PaginatedResponse } from '@/types/crm';
import { cn } from '@/lib/utils';

interface TaskListViewProps {
  filters?: {
    status?: string;
    priority?: string;
    contact_id?: string;
    deal_id?: string;
    overdue?: boolean;
  };
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
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isOverdue(dueDate?: string, status?: string): boolean {
  if (!dueDate || status === 'completed' || status === 'cancelled') return false;
  return new Date(dueDate) < new Date();
}

export function TaskListView({ filters }: TaskListViewProps) {
  const { push } = useDrillDown();
  const { get, data, isLoading, error } = useApi<PaginatedResponse<Task>>();

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('page_size', '50');
    if (filters?.status) params.set('status', filters.status);
    if (filters?.priority) params.set('priority', filters.priority);
    if (filters?.contact_id) params.set('contact_id', filters.contact_id);
    if (filters?.deal_id) params.set('deal_id', filters.deal_id);
    if (filters?.overdue) params.set('overdue_only', 'true');
    get(`/tasks?${params.toString()}`);
  }, [get, filters]);

  if (isLoading) return <LoadingSkeleton rows={8} />;

  if (error) {
    return (
      <div className="text-center text-destructive py-8">
        Error loading tasks: {error}
      </div>
    );
  }

  if (!data?.items?.length) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No tasks found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground mb-4">
        {data.total} task{data.total !== 1 ? 's' : ''} found
      </div>
      {data.items.map((task) => {
        const overdue = isOverdue(task.due_date, task.status);
        return (
          <div
            key={task.id}
            onClick={() =>
              push({
                type: 'task-detail',
                title: task.title,
                taskId: task.id,
              })
            }
            className={cn(
              'p-4 rounded-lg border bg-card',
              'hover:border-primary/50 hover:shadow-md cursor-pointer',
              'transition-all duration-200',
              overdue ? 'border-destructive/50' : 'border-border'
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'h-10 w-10 rounded-full flex items-center justify-center shrink-0',
                    overdue ? 'bg-destructive/10' : 'bg-primary/10'
                  )}
                >
                  {overdue ? (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <CheckSquare className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div>
                  <div className="font-medium">{task.title}</div>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                    {task.due_date && (
                      <span
                        className={cn(
                          'flex items-center gap-1',
                          overdue && 'text-destructive'
                        )}
                      >
                        <Calendar className="h-3 w-3" />
                        {formatDate(task.due_date)}
                        {overdue && ' (Overdue)'}
                      </span>
                    )}
                    {task.contact_name && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (task.contact_id) {
                            push({
                              type: 'contact-detail',
                              title: task.contact_name || 'Contact',
                              contactId: task.contact_id,
                            });
                          }
                        }}
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        <User className="h-3 w-3" />
                        {task.contact_name}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className={priorityColors[task.priority] || priorityColors.medium}>
                  {task.priority}
                </Badge>
                <Badge className={statusColors[task.status] || statusColors.pending}>
                  {task.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
