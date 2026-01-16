import { useEffect } from 'react';
import { CalendarDays, DollarSign, TrendingUp, CheckCircle, Clock, User, Building2 } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useDrillDown } from '@/hooks/useDrillDown';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from './LoadingSkeleton';
import type { Deal } from '@/types/deals';
import type { PaginatedResponse } from '@/types/crm';
import { cn } from '@/lib/utils';

interface ForecastMonthViewProps {
  month: string;
  monthLabel: string;
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
  });
}

export function ForecastMonthView({ month, monthLabel }: ForecastMonthViewProps) {
  const { push } = useDrillDown();
  const { get, data, isLoading, error } = useApi<PaginatedResponse<Deal>>();

  useEffect(() => {
    // Parse the month to get date range
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);

    const params = new URLSearchParams();
    params.set('page_size', '50');
    // Get deals with expected_close_date in this month
    params.set('expected_close_from', startDate.toISOString().split('T')[0]);
    params.set('expected_close_to', endDate.toISOString().split('T')[0]);
    params.set('sort_by', 'expected_close_date');
    params.set('sort_order', 'asc');
    get(`/deals?${params.toString()}`);
  }, [get, month]);

  if (isLoading) return <LoadingSkeleton rows={8} />;

  if (error) {
    return (
      <div className="text-center text-destructive py-8">
        Error loading forecast: {error}
      </div>
    );
  }

  // Categorize deals
  const closedDeals = data?.items?.filter((d) => d.actual_close_date) || [];
  const openDeals = data?.items?.filter((d) => !d.actual_close_date) || [];

  const closedValue = closedDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const expectedValue = openDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const totalValue = closedValue + expectedValue;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <CalendarDays className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{monthLabel} Forecast</h2>
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>{data?.total || 0} deal{(data?.total || 0) !== 1 ? 's' : ''} expected to close</span>
          </div>
        </div>
      </div>

      {/* Forecast Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-green-50 border border-green-200">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" />
            Closed
          </div>
          <div className="text-2xl font-bold text-green-700">
            {formatCurrency(closedValue)}
          </div>
          <div className="text-sm text-green-600">
            {closedDeals.length} deal{closedDeals.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <Clock className="h-4 w-4" />
            Expected
          </div>
          <div className="text-2xl font-bold text-blue-700">
            {formatCurrency(expectedValue)}
          </div>
          <div className="text-sm text-blue-600">
            {openDeals.length} deal{openDeals.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            Total Forecast
          </div>
          <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
          <div className="text-sm text-muted-foreground">
            {data?.total || 0} total deals
          </div>
        </div>
      </div>

      {/* Deals Lists */}
      {closedDeals.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-green-700 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Closed Deals ({closedDeals.length})
          </h3>
          {closedDeals.map((deal) => (
            <DealCard key={deal.id} deal={deal} push={push} closed />
          ))}
        </div>
      )}

      {openDeals.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-blue-700 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Expected to Close ({openDeals.length})
          </h3>
          {openDeals.map((deal) => (
            <DealCard key={deal.id} deal={deal} push={push} />
          ))}
        </div>
      )}

      {!data?.items?.length && (
        <div className="text-center text-muted-foreground py-8">
          No deals forecasted for this month
        </div>
      )}
    </div>
  );
}

interface DealCardProps {
  deal: Deal;
  push: (item: any) => void;
  closed?: boolean;
}

function DealCard({ deal, push, closed }: DealCardProps) {
  return (
    <div
      onClick={() =>
        push({
          type: 'deal-detail',
          title: deal.name,
          dealId: deal.id,
        })
      }
      className={cn(
        'p-4 rounded-lg border bg-card',
        'hover:border-primary/50 hover:shadow-md cursor-pointer',
        'transition-all duration-200',
        closed ? 'border-green-200' : 'border-border'
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
                <CalendarDays className="h-3 w-3" />
                {formatDate(deal.expected_close_date)}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={cn(
            'flex items-center gap-1 text-lg font-semibold',
            closed ? 'text-green-700' : 'text-primary'
          )}>
            <DollarSign className="h-4 w-4" />
            {formatCurrency(deal.value, deal.currency)}
          </div>
          {deal.stage_name && (
            <Badge variant="secondary">{deal.stage_name}</Badge>
          )}
        </div>
      </div>
    </div>
  );
}
