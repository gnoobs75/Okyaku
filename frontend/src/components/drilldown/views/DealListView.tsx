import { useEffect } from 'react';
import { DollarSign, Calendar, User, Building2 } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useDrillDown } from '@/hooks/useDrillDown';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from './LoadingSkeleton';
import type { Deal } from '@/types/deals';
import type { PaginatedResponse } from '@/types/crm';
import { cn } from '@/lib/utils';

interface DealListViewProps {
  filters?: {
    stage_id?: string;
    contact_id?: string;
    company_id?: string;
    close_month?: string;
    status?: 'open' | 'closed';
  };
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
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function DealListView({ filters }: DealListViewProps) {
  const { push } = useDrillDown();
  const { get, data, isLoading, error } = useApi<PaginatedResponse<Deal>>();

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('page_size', '50');
    if (filters?.stage_id) params.set('stage_id', filters.stage_id);
    if (filters?.contact_id) params.set('contact_id', filters.contact_id);
    if (filters?.company_id) params.set('company_id', filters.company_id);
    if (filters?.status) params.set('deal_status', filters.status);
    get(`/deals?${params.toString()}`);
  }, [get, filters]);

  if (isLoading) return <LoadingSkeleton rows={8} />;

  if (error) {
    return (
      <div className="text-center text-destructive py-8">
        Error loading deals: {error}
      </div>
    );
  }

  if (!data?.items?.length) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No deals found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground mb-4">
        {data.total} deal{data.total !== 1 ? 's' : ''} found
      </div>
      {data.items.map((deal) => (
        <div
          key={deal.id}
          onClick={() =>
            push({
              type: 'deal-detail',
              title: deal.name,
              dealId: deal.id,
            })
          }
          className={cn(
            'p-4 rounded-lg border border-border bg-card',
            'hover:border-primary/50 hover:shadow-md cursor-pointer',
            'transition-all duration-200'
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="font-medium">{deal.name}</div>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                {deal.contact_name && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (deal.contact_id) {
                        push({
                          type: 'contact-detail',
                          title: deal.contact_name || 'Contact',
                          contactId: deal.contact_id,
                        });
                      }
                    }}
                    className="flex items-center gap-1 hover:text-primary"
                  >
                    <User className="h-3 w-3" />
                    {deal.contact_name}
                  </button>
                )}
                {deal.company_name && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (deal.company_id) {
                        push({
                          type: 'company-detail',
                          title: deal.company_name || 'Company',
                          companyId: deal.company_id,
                        });
                      }
                    }}
                    className="flex items-center gap-1 hover:text-primary"
                  >
                    <Building2 className="h-3 w-3" />
                    {deal.company_name}
                  </button>
                )}
                {deal.expected_close_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(deal.expected_close_date)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-1 text-lg font-semibold text-primary">
                <DollarSign className="h-4 w-4" />
                {formatCurrency(deal.value, deal.currency)}
              </div>
              {deal.stage_name && (
                <Badge variant="secondary">{deal.stage_name}</Badge>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
