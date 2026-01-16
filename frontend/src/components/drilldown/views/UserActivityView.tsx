import { useEffect } from 'react';
import { User, Phone, Mail, Calendar, FileText, MessageSquare, MoreHorizontal, Briefcase, Trophy } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useDrillDown } from '@/hooks/useDrillDown';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from './LoadingSkeleton';
import type { Activity } from '@/types/activities';
import type { PaginatedResponse } from '@/types/crm';
import { cn } from '@/lib/utils';

interface UserActivityViewProps {
  userId: string;
  userName: string;
  dateFrom?: string;
  dateTo?: string;
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
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function UserActivityView({
  userId,
  userName,
  dateFrom,
  dateTo,
}: UserActivityViewProps) {
  const { push } = useDrillDown();
  const { get, data, isLoading, error } = useApi<PaginatedResponse<Activity>>();

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('page_size', '50');
    params.set('created_by', userId);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    get(`/activities?${params.toString()}`);
  }, [get, userId, dateFrom, dateTo]);

  if (isLoading) return <LoadingSkeleton rows={8} />;

  if (error) {
    return (
      <div className="text-center text-destructive py-8">
        Error loading activities: {error}
      </div>
    );
  }

  // Calculate activity stats
  const activityCounts: Record<string, number> = {};
  data?.items?.forEach((activity) => {
    activityCounts[activity.type] = (activityCounts[activity.type] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{userName}</h2>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Trophy className="h-4 w-4" />
            <span>{data?.total || 0} activities logged</span>
          </div>
        </div>
      </div>

      {/* Activity Stats */}
      {Object.keys(activityCounts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(activityCounts).map(([type, count]) => (
            <Badge key={type} className={activityColors[type] || activityColors.other}>
              {activityIcons[type]} {count} {type}{count !== 1 ? 's' : ''}
            </Badge>
          ))}
        </div>
      )}

      {/* Activities List */}
      {!data?.items?.length ? (
        <div className="text-center text-muted-foreground py-8">
          No activities found for this user
        </div>
      ) : (
        <div className="space-y-2">
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
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mt-1"
                      >
                        <User className="h-3 w-3" />
                        {activity.contact_name}
                      </button>
                    )}
                  </div>
                </div>
                <Badge className={activityColors[activity.type] || activityColors.other}>
                  {activity.type}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
