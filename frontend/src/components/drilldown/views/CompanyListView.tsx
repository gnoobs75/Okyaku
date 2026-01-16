import { useEffect } from 'react';
import { Building2, Globe, Phone, MapPin } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useDrillDown } from '@/hooks/useDrillDown';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from './LoadingSkeleton';
import type { Company, PaginatedResponse } from '@/types/crm';
import { cn } from '@/lib/utils';

interface CompanyListViewProps {
  filters?: {
    search?: string;
  };
}

export function CompanyListView({ filters }: CompanyListViewProps) {
  const { push } = useDrillDown();
  const { get, data, isLoading, error } = useApi<PaginatedResponse<Company>>();

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('page_size', '50');
    if (filters?.search) params.set('search', filters.search);
    get(`/companies?${params.toString()}`);
  }, [get, filters]);

  if (isLoading) return <LoadingSkeleton rows={8} />;

  if (error) {
    return (
      <div className="text-center text-destructive py-8">
        Error loading companies: {error}
      </div>
    );
  }

  if (!data?.items?.length) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No companies found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground mb-4">
        {data.total} compan{data.total !== 1 ? 'ies' : 'y'} found
      </div>
      {data.items.map((company) => (
        <div
          key={company.id}
          onClick={() =>
            push({
              type: 'company-detail',
              title: company.name,
              companyId: company.id,
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
              <div className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <div className="font-medium">{company.name}</div>
                {company.industry && (
                  <div className="text-sm text-muted-foreground">
                    {company.industry}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                  {company.website && (
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {company.website}
                    </span>
                  )}
                  {company.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {company.phone}
                    </span>
                  )}
                  {company.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {company.city}
                      {company.country && `, ${company.country}`}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {company.size && (
              <Badge variant="secondary">{company.size}</Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
