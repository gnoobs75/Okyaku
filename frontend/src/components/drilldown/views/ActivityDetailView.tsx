import { useEffect } from 'react';
import { Phone, Mail, Calendar, FileText, MessageSquare, MoreHorizontal, User, Building2, Briefcase, Clock } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useDrillDown } from '@/hooks/useDrillDown';
import { Badge } from '@/components/ui/badge';
import { DetailSkeleton } from './LoadingSkeleton';
import type { Activity } from '@/types/activities';

interface ActivityDetailViewProps {
  activityId: string;
}

const activityIcons: Record<string, React.ReactNode> = {
  call: <Phone className="h-5 w-5" />,
  email: <Mail className="h-5 w-5" />,
  meeting: <Calendar className="h-5 w-5" />,
  note: <FileText className="h-5 w-5" />,
  task: <MessageSquare className="h-5 w-5" />,
  other: <MoreHorizontal className="h-5 w-5" />,
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
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(minutes?: number): string {
  if (!minutes) return '-';
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
}

export function ActivityDetailView({ activityId }: ActivityDetailViewProps) {
  const { push } = useDrillDown();
  const { get, data: activity, isLoading, error } = useApi<Activity>();

  useEffect(() => {
    get(`/activities/${activityId}`);
  }, [get, activityId]);

  if (isLoading) return <DetailSkeleton />;

  if (error) {
    return (
      <div className="text-center text-destructive py-8">
        Error loading activity: {error}
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Activity not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${
              activityColors[activity.type] || activityColors.other
            }`}
          >
            {activityIcons[activity.type] || activityIcons.other}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{activity.subject}</h2>
            <p className="text-muted-foreground">
              {formatDateTime(activity.activity_date)}
            </p>
          </div>
        </div>
        <Badge className={activityColors[activity.type] || activityColors.other}>
          {activity.type}
        </Badge>
      </div>

      {/* Activity Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activity.duration_minutes && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Duration: {formatDuration(activity.duration_minutes)}</span>
          </div>
        )}
        {activity.outcome && (
          <div className="flex items-center gap-2 text-sm">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span>Outcome: {activity.outcome}</span>
          </div>
        )}
        {activity.contact_name && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <button
              onClick={() => {
                if (activity.contact_id) {
                  push({
                    type: 'contact-detail',
                    title: activity.contact_name || 'Contact',
                    contactId: activity.contact_id,
                  });
                }
              }}
              className="hover:text-primary hover:underline"
            >
              {activity.contact_name}
            </button>
          </div>
        )}
        {activity.company_name && (
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <button
              onClick={() => {
                if (activity.company_id) {
                  push({
                    type: 'company-detail',
                    title: activity.company_name || 'Company',
                    companyId: activity.company_id,
                  });
                }
              }}
              className="hover:text-primary hover:underline"
            >
              {activity.company_name}
            </button>
          </div>
        )}
        {activity.deal_name && (
          <div className="flex items-center gap-2 text-sm">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <button
              onClick={() => {
                if (activity.deal_id) {
                  push({
                    type: 'deal-detail',
                    title: activity.deal_name || 'Deal',
                    dealId: activity.deal_id,
                  });
                }
              }}
              className="hover:text-primary hover:underline"
            >
              {activity.deal_name}
            </button>
          </div>
        )}
        {activity.owner_name && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>Owner: {activity.owner_name}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>Created {formatDate(activity.created_at)}</span>
        </div>
      </div>

      {/* Description */}
      {activity.description && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Description
          </h3>
          <p className="text-sm whitespace-pre-wrap">{activity.description}</p>
        </div>
      )}
    </div>
  );
}
