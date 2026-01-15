import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/useApi";
import type { Task, TaskCreate, TaskPriority, TaskStatus } from "@/types/activities";
import type { Contact, Company, PaginatedResponse } from "@/types/crm";
import type { Deal } from "@/types/deals";

interface TaskFormModalProps {
  task: Task | null;
  onClose: () => void;
  onSaved: () => void;
}

export function TaskFormModal({ task, onClose, onSaved }: TaskFormModalProps) {
  const isEditing = !!task;

  const [formData, setFormData] = useState<TaskCreate & { status?: TaskStatus }>({
    title: task?.title || "",
    description: task?.description || "",
    due_date: task?.due_date || "",
    priority: task?.priority || "medium",
    status: task?.status,
    contact_id: task?.contact_id || "",
    company_id: task?.company_id || "",
    deal_id: task?.deal_id || "",
  });

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { get: getContacts } = useApi<PaginatedResponse<Contact>>();
  const { get: getCompanies } = useApi<PaginatedResponse<Company>>();
  const { get: getDeals } = useApi<PaginatedResponse<Deal>>();
  const { post, put, delete: deleteTask, isLoading: saving } = useApi<Task>();

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
    setFormData((prev) => ({ ...prev, [name]: value || undefined }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    let result;
    if (isEditing && task) {
      result = await put(`/tasks/${task.id}`, formData);
    } else {
      result = await post("/tasks", formData);
    }

    if (result) {
      onSaved();
    }
  };

  const handleDelete = async () => {
    if (!task || !confirm("Are you sure you want to delete this task?")) return;
    await deleteTask(`/tasks/${task.id}`);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEditing ? "Edit Task" : "New Task"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title}</p>
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
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                name="due_date"
                type="date"
                value={formData.due_date || ""}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </div>
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
          )}

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
                {saving ? "Saving..." : "Save Task"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
