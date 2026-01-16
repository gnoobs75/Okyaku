import { useEffect } from 'react';
import { TrendingUp, DollarSign, BarChart3, User, Building2, Calendar } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useDrillDown } from '@/hooks/useDrillDown';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from './LoadingSkeleton';
import type { Deal } from '@/types/deals';
import type { PaginatedResponse } from '@/types/crm';
import { cn } from '@/lib/utils';

interface PipelineStageViewProps {
  stageId: string;
  stageName: string;
  pipelineId: string;
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

export function PipelineStageView({
  stageId,
  stageName,
}: PipelineStageViewProps) {
  const { push } = useDrillDown();
  const { get, data, isLoading, error } = useApi<PaginatedResponse<Deal>>();

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('page_size', '50');
    params.set('stage_id', stageId);
    get(`/deals?${params.toString()}`);
  }, [get, stageId]);

  if (isLoading) return <LoadingSkeleton rows={8} />;

  if (error) {
    return (
      <div className="text-center text-destructive py-8">
        Error loading deals: {error}
      </div>
    );
  }

  // Calculate stage stats
  const totalValue = data?.items?.reduce((sum, deal) => sum + (deal.value || 0), 0) || 0;
  const dealCount = data?.total || 0;
  const avgDealSize = dealCount > 0 ? totalValue / dealCount : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <TrendingUp className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{stageName}</h2>
          <div className="flex items-center gap-2 text-muted-foreground">
            <BarChart3 className="h-4 w-4" />
            <span>{dealCount} deal{dealCount !== 1 ? 's' : ''} in this stage</span>
          </div>
        </div>
      </div>

      {/* Stage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-muted/50 border">
          <div className="text-sm text-muted-foreground">Total Value</div>
          <div className="text-2xl font-bold text-primary">
            {formatCurrency(totalValue)}
          </div>
        </div>
        <div className="p-4 rounded-lg bg-muted/50 border">
          <div className="text-sm text-muted-foreground">Deal Count</div>
          <div className="text-2xl font-bold">{dealCount}</div>
        </div>
        <div className="p-4 rounded-lg bg-muted/50 border">
          <div className="text-sm text-muted-foreground">Avg. Deal Size</div>
          <div className="text-2xl font-bold">{formatCurrency(avgDealSize)}</div>
        </div>
      </div>

      {/* Deals List */}
      {!data?.items?.length ? (
        <div className="text-center text-muted-foreground py-8">
          No deals in this stage
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Deals in {stageName}
          </h3>
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
                <div className="flex items-center gap-1 text-lg font-semibold text-primary">
                  <DollarSign className="h-4 w-4" />
                  {formatCurrency(deal.value, deal.currency)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
