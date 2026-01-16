import { useEffect } from 'react';
import { User, Building2, Mail, Phone } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useDrillDown } from '@/hooks/useDrillDown';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from './LoadingSkeleton';
import type { Contact, PaginatedResponse } from '@/types/crm';
import { cn } from '@/lib/utils';

interface ContactListViewProps {
  filters?: {
    status?: string;
    company_id?: string;
    search?: string;
  };
}

const statusColors: Record<string, string> = {
  lead: 'bg-blue-100 text-blue-800',
  prospect: 'bg-yellow-100 text-yellow-800',
  customer: 'bg-green-100 text-green-800',
  churned: 'bg-red-100 text-red-800',
  other: 'bg-gray-100 text-gray-800',
};

export function ContactListView({ filters }: ContactListViewProps) {
  const { push } = useDrillDown();
  const { get, data, isLoading, error } = useApi<PaginatedResponse<Contact>>();

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('page_size', '50');
    if (filters?.status) params.set('status', filters.status);
    if (filters?.company_id) params.set('company_id', filters.company_id);
    if (filters?.search) params.set('search', filters.search);
    get(`/contacts?${params.toString()}`);
  }, [get, filters]);

  if (isLoading) return <LoadingSkeleton rows={8} />;

  if (error) {
    return (
      <div className="text-center text-destructive py-8">
        Error loading contacts: {error}
      </div>
    );
  }

  if (!data?.items?.length) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No contacts found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground mb-4">
        {data.total} contact{data.total !== 1 ? 's' : ''} found
      </div>
      {data.items.map((contact) => (
        <div
          key={contact.id}
          onClick={() =>
            push({
              type: 'contact-detail',
              title: `${contact.first_name} ${contact.last_name}`,
              contactId: contact.id,
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
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">
                  {contact.first_name} {contact.last_name}
                </div>
                {contact.job_title && (
                  <div className="text-sm text-muted-foreground">
                    {contact.job_title}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                  {contact.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {contact.email}
                    </span>
                  )}
                  {contact.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {contact.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={statusColors[contact.status] || statusColors.other}>
                {contact.status}
              </Badge>
              {contact.company_name && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (contact.company_id) {
                      push({
                        type: 'company-detail',
                        title: contact.company_name || 'Company',
                        companyId: contact.company_id,
                      });
                    }
                  }}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                >
                  <Building2 className="h-3 w-3" />
                  {contact.company_name}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
