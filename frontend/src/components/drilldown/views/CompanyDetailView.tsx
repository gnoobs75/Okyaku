import { useEffect } from 'react';
import { Globe, Phone, MapPin, Calendar, Users, Briefcase, Activity as ActivityIcon } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useDrillDown } from '@/hooks/useDrillDown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DetailSkeleton } from './LoadingSkeleton';
import type { Company } from '@/types/crm';

interface CompanyDetailViewProps {
  companyId: string;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function CompanyDetailView({ companyId }: CompanyDetailViewProps) {
  const { push } = useDrillDown();
  const { get, data: company, isLoading, error } = useApi<Company>();

  useEffect(() => {
    get(`/companies/${companyId}`);
  }, [get, companyId]);

  if (isLoading) return <DetailSkeleton />;

  if (error) {
    return (
      <div className="text-center text-destructive py-8">
        Error loading company: {error}
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Company not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{company.name}</h2>
          {company.industry && (
            <p className="text-muted-foreground">{company.industry}</p>
          )}
        </div>
        {company.size && <Badge variant="secondary">{company.size}</Badge>}
      </div>

      {/* Company Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {company.website && (
          <div className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <a
              href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary hover:underline"
            >
              {company.website}
            </a>
          </div>
        )}
        {company.domain && (
          <div className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span>{company.domain}</span>
          </div>
        )}
        {company.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a href={`tel:${company.phone}`} className="hover:text-primary">
              {company.phone}
            </a>
          </div>
        )}
        {(company.city || company.country) && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>
              {[company.address, company.city, company.state, company.country]
                .filter(Boolean)
                .join(', ')}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>Created {formatDate(company.created_at)}</span>
        </div>
      </div>

      {/* Description */}
      {company.description && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Description
          </h3>
          <p className="text-sm whitespace-pre-wrap">{company.description}</p>
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
                type: 'contacts-list',
                title: `Contacts - ${company.name}`,
                filters: { company_id: companyId },
              })
            }
          >
            <Users className="h-4 w-4 mr-2" />
            View Contacts
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              push({
                type: 'deals-list',
                title: `Deals - ${company.name}`,
                filters: { company_id: companyId },
              })
            }
          >
            <Briefcase className="h-4 w-4 mr-2" />
            View Deals
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              push({
                type: 'activities-list',
                title: `Activities - ${company.name}`,
                filters: { contact_id: companyId },
              })
            }
          >
            <ActivityIcon className="h-4 w-4 mr-2" />
            View Activities
          </Button>
        </div>
      </div>
    </div>
  );
}
