import { useEffect } from 'react';
import { Mail, Phone, Building2, MapPin, Calendar, Briefcase, ClipboardList, Activity as ActivityIcon } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useDrillDown } from '@/hooks/useDrillDown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DetailSkeleton } from './LoadingSkeleton';
import type { Contact } from '@/types/crm';
import { cn } from '@/lib/utils';

interface ContactDetailViewProps {
  contactId: string;
}

const statusColors: Record<string, string> = {
  lead: 'bg-blue-100 text-blue-800',
  prospect: 'bg-yellow-100 text-yellow-800',
  customer: 'bg-green-100 text-green-800',
  churned: 'bg-red-100 text-red-800',
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

export function ContactDetailView({ contactId }: ContactDetailViewProps) {
  const { push } = useDrillDown();
  const { get, data: contact, isLoading, error } = useApi<Contact>();

  useEffect(() => {
    get(`/contacts/${contactId}`);
  }, [get, contactId]);

  if (isLoading) return <DetailSkeleton />;

  if (error) {
    return (
      <div className="text-center text-destructive py-8">
        Error loading contact: {error}
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Contact not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {contact.first_name} {contact.last_name}
          </h2>
          {contact.job_title && (
            <p className="text-muted-foreground">{contact.job_title}</p>
          )}
        </div>
        <Badge className={statusColors[contact.status] || statusColors.other}>
          {contact.status}
        </Badge>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contact.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <a href={`mailto:${contact.email}`} className="hover:text-primary">
              {contact.email}
            </a>
          </div>
        )}
        {contact.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a href={`tel:${contact.phone}`} className="hover:text-primary">
              {contact.phone}
            </a>
          </div>
        )}
        {contact.mobile && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a href={`tel:${contact.mobile}`} className="hover:text-primary">
              {contact.mobile} (Mobile)
            </a>
          </div>
        )}
        {contact.company_name && (
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <button
              onClick={() => {
                if (contact.company_id) {
                  push({
                    type: 'company-detail',
                    title: contact.company_name || 'Company',
                    companyId: contact.company_id,
                  });
                }
              }}
              className="hover:text-primary hover:underline"
            >
              {contact.company_name}
            </button>
          </div>
        )}
        {(contact.city || contact.country) && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>
              {[contact.city, contact.state, contact.country]
                .filter(Boolean)
                .join(', ')}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>Created {formatDate(contact.created_at)}</span>
        </div>
      </div>

      {/* Additional Info */}
      {(contact.department || contact.source) && (
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {contact.department && (
              <div>
                <span className="text-muted-foreground">Department:</span>{' '}
                {contact.department}
              </div>
            )}
            {contact.source && (
              <div>
                <span className="text-muted-foreground">Source:</span>{' '}
                {contact.source}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {contact.notes && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
          <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
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
                type: 'deals-list',
                title: `Deals - ${contact.first_name} ${contact.last_name}`,
                filters: { contact_id: contactId },
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
                title: `Activities - ${contact.first_name} ${contact.last_name}`,
                filters: { contact_id: contactId },
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
                title: `Tasks - ${contact.first_name} ${contact.last_name}`,
                filters: { contact_id: contactId },
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
