import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/useApi";
import type { Company, Contact, ContactCreate, PaginatedResponse } from "@/types/crm";

export function ContactFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [formData, setFormData] = useState<ContactCreate>({
    first_name: "",
    last_name: "",
    email: "",
    status: "lead",
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { get: getContact, isLoading: loadingContact } = useApi<Contact>();
  const { get: getCompanies } = useApi<PaginatedResponse<Company>>();
  const { post, put, isLoading: saving } = useApi<Contact>();

  const loadData = useCallback(async () => {
    // Load companies for dropdown
    const companiesResult = await getCompanies("/companies?page_size=100");
    if (companiesResult) {
      setCompanies(companiesResult.items);
    }

    // Load contact if editing
    if (id) {
      const contact = await getContact(`/contacts/${id}`);
      if (contact) {
        setFormData({
          first_name: contact.first_name,
          last_name: contact.last_name,
          email: contact.email,
          phone: contact.phone,
          mobile: contact.mobile,
          job_title: contact.job_title,
          department: contact.department,
          status: contact.status,
          source: contact.source,
          company_id: contact.company_id,
          address: contact.address,
          city: contact.city,
          state: contact.state,
          country: contact.country,
          postal_code: contact.postal_code,
          notes: contact.notes,
        });
      }
    }
  }, [id, getContact, getCompanies]);

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

    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required";
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = "Last name is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    let result;
    if (isEditing) {
      result = await put(`/contacts/${id}`, formData);
    } else {
      result = await post("/contacts", formData);
    }

    if (result) {
      navigate("/contacts");
    }
  };

  if (loadingContact && isEditing) {
    return <div className="flex justify-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEditing ? "Edit Contact" : "New Contact"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? "Update contact information" : "Add a new contact to your CRM"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className={errors.first_name ? "border-red-500" : ""}
                  />
                  {errors.first_name && (
                    <p className="text-sm text-red-500">{errors.first_name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    className={errors.last_name ? "border-red-500" : ""}
                  />
                  {errors.last_name && (
                    <p className="text-sm text-red-500">{errors.last_name}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone || ""}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile</Label>
                  <Input
                    id="mobile"
                    name="mobile"
                    value={formData.mobile || ""}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Work Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Label htmlFor="job_title">Job Title</Label>
                <Input
                  id="job_title"
                  name="job_title"
                  value={formData.job_title || ""}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  name="department"
                  value={formData.department || ""}
                  onChange={handleChange}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="lead">Lead</option>
                    <option value="prospect">Prospect</option>
                    <option value="customer">Customer</option>
                    <option value="churned">Churned</option>
                    <option value="other">Other</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source">Source</Label>
                  <Input
                    id="source"
                    name="source"
                    value={formData.source || ""}
                    onChange={handleChange}
                    placeholder="e.g., website, referral"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes || ""}
                onChange={handleChange}
                placeholder="Add any additional notes about this contact..."
                rows={4}
              />
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/contacts")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Contact"}
          </Button>
        </div>
      </form>
    </div>
  );
}
