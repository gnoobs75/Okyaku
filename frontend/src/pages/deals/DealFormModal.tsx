import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/useApi";
import type { Deal, DealCreate, Pipeline } from "@/types/deals";
import type { Company, Contact, PaginatedResponse } from "@/types/crm";

interface DealFormModalProps {
  pipeline: Pipeline;
  deal: Deal | null;
  onClose: () => void;
  onSaved: () => void;
}

export function DealFormModal({
  pipeline,
  deal,
  onClose,
  onSaved,
}: DealFormModalProps) {
  const isEditing = !!deal;

  const [formData, setFormData] = useState<DealCreate>({
    name: deal?.name || "",
    value: deal?.value || 0,
    currency: deal?.currency || "USD",
    pipeline_id: pipeline.id,
    stage_id: deal?.stage_id || pipeline.stages[0]?.id || "",
    expected_close_date: deal?.expected_close_date || "",
    contact_id: deal?.contact_id || "",
    company_id: deal?.company_id || "",
    description: deal?.description || "",
    priority: deal?.priority || "",
    source: deal?.source || "",
  });

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { get: getContacts } = useApi<PaginatedResponse<Contact>>();
  const { get: getCompanies } = useApi<PaginatedResponse<Company>>();
  const { post, put, delete: deleteDeal, isLoading: saving } = useApi<Deal>();

  const loadData = useCallback(async () => {
    const [contactsResult, companiesResult] = await Promise.all([
      getContacts("/contacts?page_size=100"),
      getCompanies("/companies?page_size=100"),
    ]);
    if (contactsResult) setContacts(contactsResult.items);
    if (companiesResult) setCompanies(companiesResult.items);
  }, [getContacts, getCompanies]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "value" ? parseFloat(value) || 0 : value || undefined,
    }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Deal name is required";
    }
    if (!formData.stage_id) {
      newErrors.stage_id = "Stage is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    let result;
    if (isEditing && deal) {
      result = await put(`/deals/${deal.id}`, formData);
    } else {
      result = await post("/deals", formData);
    }

    if (result) {
      onSaved();
    }
  };

  const handleDelete = async () => {
    if (!deal || !confirm("Are you sure you want to delete this deal?")) return;
    await deleteDeal(`/deals/${deal.id}`);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEditing ? "Edit Deal" : "New Deal"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Deal Name *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                name="value"
                type="number"
                step="0.01"
                value={formData.value}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stage_id">Stage *</Label>
            <Select
              id="stage_id"
              name="stage_id"
              value={formData.stage_id}
              onChange={handleChange}
              className={errors.stage_id ? "border-red-500" : ""}
            >
              {pipeline.stages
                .sort((a, b) => a.order - b.order)
                .map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected_close_date">Expected Close Date</Label>
            <Input
              id="expected_close_date"
              name="expected_close_date"
              type="date"
              value={formData.expected_close_date || ""}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_id">Company</Label>
            <Select
              id="company_id"
              name="company_id"
              value={formData.company_id || ""}
              onChange={handleChange}
            >
              <option value="">Select a company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_id">Contact</Label>
            <Select
              id="contact_id"
              name="contact_id"
              value={formData.contact_id || ""}
              onChange={handleChange}
            >
              <option value="">Select a contact</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.first_name} {contact.last_name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                id="priority"
                name="priority"
                value={formData.priority || ""}
                onChange={handleChange}
              >
                <option value="">Select priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                name="source"
                value={formData.source || ""}
                onChange={handleChange}
                placeholder="e.g., inbound, referral"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description || ""}
              onChange={handleChange}
              rows={3}
            />
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
                {saving ? "Saving..." : "Save Deal"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
