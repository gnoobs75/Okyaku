import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/useApi";
import type { Activity, ActivityCreate, ActivityType } from "@/types/activities";
import type { Contact, Company, PaginatedResponse } from "@/types/crm";
import type { Deal } from "@/types/deals";

interface ActivityFormModalProps {
  activity: Activity | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ActivityFormModal({
  activity,
  onClose,
  onSaved,
}: ActivityFormModalProps) {
  const isEditing = !!activity?.id;

  const [formData, setFormData] = useState<ActivityCreate>({
    type: activity?.type || "call",
    subject: activity?.subject || "",
    description: activity?.description || "",
    activity_date: activity?.activity_date
      ? new Date(activity.activity_date).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    duration_minutes: activity?.duration_minutes,
    outcome: activity?.outcome || "",
    contact_id: activity?.contact_id || "",
    company_id: activity?.company_id || "",
    deal_id: activity?.deal_id || "",
  });

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { get: getContacts } = useApi<PaginatedResponse<Contact>>();
  const { get: getCompanies } = useApi<PaginatedResponse<Company>>();
  const { get: getDeals } = useApi<PaginatedResponse<Deal>>();
  const { post, put, delete: deleteActivity, isLoading: saving } = useApi<Activity>();

  const loadData = useCallback(async () => {
    const [contactsResult, companiesResult, dealsResult] = await Promise.all([
      getContacts("/contacts?page_size=100"),
      getCompanies("/companies?page_size=100"),
      getDeals("/deals?page_size=100"),
    ]);
    if (contactsResult) setContacts(contactsResult.items);
    if (companiesResult) setCompanies(companiesResult.items);
    if (dealsResult) setDeals(dealsResult.items);
  }, [getContacts, getCompanies, getDeals]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "duration_minutes"
          ? value
            ? parseInt(value)
            : undefined
          : value || undefined,
    }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    let result;
    if (isEditing && activity) {
      result = await put(`/activities/${activity.id}`, formData);
    } else {
      result = await post("/activities", formData);
    }

    if (result) {
      onSaved();
    }
  };

  const handleDelete = async () => {
    if (!activity || !confirm("Are you sure you want to delete this activity?"))
      return;
    await deleteActivity(`/activities/${activity.id}`);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEditing ? "Edit Activity" : "Log Activity"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
            >
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="meeting">Meeting</option>
              <option value="note">Note</option>
              <option value="other">Other</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className={errors.subject ? "border-red-500" : ""}
              placeholder={
                formData.type === "call"
                  ? "e.g., Follow-up call with John"
                  : formData.type === "email"
                  ? "e.g., Sent proposal"
                  : formData.type === "meeting"
                  ? "e.g., Product demo"
                  : "Activity subject"
              }
            />
            {errors.subject && (
              <p className="text-sm text-red-500">{errors.subject}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description || ""}
              onChange={handleChange}
              rows={3}
              placeholder="Add notes about this activity..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="activity_date">Date & Time</Label>
              <Input
                id="activity_date"
                name="activity_date"
                type="datetime-local"
                value={formData.activity_date || ""}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration_minutes">Duration (minutes)</Label>
              <Input
                id="duration_minutes"
                name="duration_minutes"
                type="number"
                value={formData.duration_minutes || ""}
                onChange={handleChange}
                placeholder="e.g., 30"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="outcome">Outcome</Label>
            <Select
              id="outcome"
              name="outcome"
              value={formData.outcome || ""}
              onChange={handleChange}
            >
              <option value="">Select outcome</option>
              {formData.type === "call" && (
                <>
                  <option value="connected">Connected</option>
                  <option value="left_voicemail">Left Voicemail</option>
                  <option value="no_answer">No Answer</option>
                  <option value="busy">Busy</option>
                  <option value="wrong_number">Wrong Number</option>
                </>
              )}
              {formData.type === "email" && (
                <>
                  <option value="sent">Sent</option>
                  <option value="replied">Replied</option>
                  <option value="bounced">Bounced</option>
                </>
              )}
              {formData.type === "meeting" && (
                <>
                  <option value="completed">Completed</option>
                  <option value="rescheduled">Rescheduled</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no_show">No Show</option>
                </>
              )}
              <option value="other">Other</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_id">Related Contact</Label>
            <Select
              id="contact_id"
              name="contact_id"
              value={formData.contact_id || ""}
              onChange={handleChange}
            >
              <option value="">None</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.first_name} {contact.last_name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_id">Related Company</Label>
            <Select
              id="company_id"
              name="company_id"
              value={formData.company_id || ""}
              onChange={handleChange}
            >
              <option value="">None</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal_id">Related Deal</Label>
            <Select
              id="deal_id"
              name="deal_id"
              value={formData.deal_id || ""}
              onChange={handleChange}
            >
              <option value="">None</option>
              {deals.map((deal) => (
                <option key={deal.id} value={deal.id}>
                  {deal.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex justify-between pt-4 border-t">
            {isEditing && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={saving}
              >
                Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Activity"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
