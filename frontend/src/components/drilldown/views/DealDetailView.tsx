import { useEffect } from 'react';
import { DollarSign, Calendar, User, Building2, Activity as ActivityIcon, ClipboardList, TrendingUp } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useDrillDown } from '@/hooks/useDrillDown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DetailSkeleton } from './LoadingSkeleton';
import type { Deal } from '@/types/deals';

interface DealDetailViewProps {
  dealId: string;
}

function formatCurrency(value: number | undefined, currency: string = 'USD'): string {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export function DealDetailView({ dealId }: DealDetailViewProps) {
  const { push } = useDrillDown();
  const { get, data: deal, isLoading, error } = useApi<Deal>();

  useEffect(() => {
    get(`/deals/${dealId}`);
  }, [get, dealId]);

  if (isLoading) return <DetailSkeleton />;

  if (error) {
    return (
      <div className="text-center text-destructive py-8">
        Error loading deal: {error}
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Deal not found
      </div>
    );
  }

  const isClosed = !!deal.actual_close_date;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{deal.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <DollarSign className="h-5 w-5 text-primary" />
            <span className="text-xl font-semibold text-primary">
              {formatCurrency(deal.value, deal.currency)}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {deal.stage_name && (
            <Badge variant="secondary">{deal.stage_name}</Badge>
          )}
          {deal.priority && (
            <Badge className={priorityColors[deal.priority] || priorityColors.medium}>
              {deal.priority}
            </Badge>
          )}
        </div>
      </div>

      {/* Deal Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {deal.contact_name && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <button
              onClick={() => {
                if (deal.contact_id) {
                  push({
                    type: 'contact-detail',
                    title: deal.contact_name || 'Contact',
                    contactId: deal.contact_id,
                  });
                }
              }}
              className="hover:text-primary hover:underline"
            >
              {deal.contact_name}
            </button>
          </div>
        )}
        {deal.company_name && (
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <button
              onClick={() => {
                if (deal.company_id) {
                  push({
                    type: 'company-detail',
                    title: deal.company_name || 'Company',
                    companyId: deal.company_id,
                  });
                }
              }}
              className="hover:text-primary hover:underline"
            >
              {deal.company_name}
            </button>
          </div>
        )}
        {deal.pipeline_name && (
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span>{deal.pipeline_name}</span>
          </div>
        )}
        {deal.expected_close_date && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Expected: {formatDate(deal.expected_close_date)}</span>
          </div>
        )}
        {deal.actual_close_date && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-green-600" />
            <span className="text-green-600">
              Closed: {formatDate(deal.actual_close_date)}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>Created {formatDate(deal.created_at)}</span>
        </div>
      </div>

      {/* Additional Info */}
      {(deal.source || deal.owner_name) && (
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {deal.source && (
              <div>
                <span className="text-muted-foreground">Source:</span> {deal.source}
              </div>
            )}
            {deal.owner_name && (
              <div>
                <span className="text-muted-foreground">Owner:</span>{' '}
                {deal.owner_name}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Description */}
      {deal.description && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Description
          </h3>
          <p className="text-sm whitespace-pre-wrap">{deal.description}</p>
        </div>
      )}

      {/* Lost Reason */}
      {deal.lost_reason && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-destructive mb-2">
            Lost Reason
          </h3>
          <p className="text-sm text-destructive">{deal.lost_reason}</p>
        </div>
      )}

      {/* Related Actions */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Related Records
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              push({
                type: 'activities-list',
                title: `Activities - ${deal.name}`,
                filters: { deal_id: dealId },
              })
            }
          >
            <ActivityIcon className="h-4 w-4 mr-2" />
            View Activities
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              push({
                type: 'tasks-list',
                title: `Tasks - ${deal.name}`,
                filters: { deal_id: dealId },
              })
            }
          >
            <ClipboardList className="h-4 w-4 mr-2" />
            View Tasks
          </Button>
        </div>
      </div>
    </div>
  );
}
