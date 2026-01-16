import { useEffect } from 'react';
import { Phone, Mail, Calendar, FileText, MessageSquare, MoreHorizontal, User, Briefcase } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useDrillDown } from '@/hooks/useDrillDown';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from './LoadingSkeleton';
import type { Activity } from '@/types/activities';
import type { PaginatedResponse } from '@/types/crm';
import { cn } from '@/lib/utils';

interface ActivityListViewProps {
  filters?: {
    type?: string;
    contact_id?: string;
    deal_id?: string;
    user_id?: string;
    date_from?: string;
    date_to?: string;
  };
}

const activityIcons: Record<string, React.ReactNode> = {
  call: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  meeting: <Calendar className="h-4 w-4" />,
  note: <FileText className="h-4 w-4" />,
  task: <MessageSquare className="h-4 w-4" />,
  other: <MoreHorizontal className="h-4 w-4" />,
};

const activityColors: Record<string, string> = {
  call: 'bg-green-100 text-green-800',
  email: 'bg-blue-100 text-blue-800',
  meeting: 'bg-purple-100 text-purple-800',
  note: 'bg-yellow-100 text-yellow-800',
  task: 'bg-orange-100 text-orange-800',
  other: 'bg-gray-100 text-gray-800',
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ActivityListView({ filters }: ActivityListViewProps) {
  const { push } = useDrillDown();
  const { get, data, isLoading, error } = useApi<PaginatedResponse<Activity>>();

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('page_size', '50');
    if (filters?.type) params.set('type', filters.type);
    if (filters?.contact_id) params.set('contact_id', filters.contact_id);
    if (filters?.deal_id) params.set('deal_id', filters.deal_id);
    if (filters?.user_id) params.set('created_by', filters.user_id);
    if (filters?.date_from) params.set('date_from', filters.date_from);
    if (filters?.date_to) params.set('date_to', filters.date_to);
    get(`/activities?${params.toString()}`);
  }, [get, filters]);

  if (isLoading) return <LoadingSkeleton rows={8} />;

  if (error) {
    return (
      <div className="text-center text-destructive py-8">
        Error loading activities: {error}
      </div>
    );
  }

  if (!data?.items?.length) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No activities found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground mb-4">
        {data.total} activit{data.total !== 1 ? 'ies' : 'y'} found
      </div>
      {data.items.map((activity) => (
        <div
          key={activity.id}
          onClick={() =>
            push({
              type: 'activity-detail',
              title: activity.subject,
              activityId: activity.id,
            })
          }
          className={cn(
            'p-4 rounded-lg border border-border bg-card',
            'hover:border-primary/50 hover:shadow-md cursor-pointer',
            'transition-all duration-200'
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center shrink-0',
                  activityColors[activity.type] || activityColors.other
                )}
              >
                {activityIcons[activity.type] || activityIcons.other}
              </div>
              <div>
                <div className="font-medium">{activity.subject}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {formatDate(activity.activity_date)}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                  {activity.contact_name && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activity.contact_id) {
                          push({
                            type: 'contact-detail',
                            title: activity.contact_name || 'Contact',
                            contactId: activity.contact_id,
                          });
                        }
                      }}
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <User className="h-3 w-3" />
                      {activity.contact_name}
                    </button>
                  )}
                  {activity.deal_name && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activity.deal_id) {
                          push({
                            type: 'deal-detail',
                            title: activity.deal_name || 'Deal',
                            dealId: activity.deal_id,
                          });
                        }
                      }}
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <Briefcase className="h-3 w-3" />
                      {activity.deal_name}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <Badge className={activityColors[activity.type] || activityColors.other}>
              {activity.type}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
