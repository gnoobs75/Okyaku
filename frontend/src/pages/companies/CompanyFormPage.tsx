import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EnrichmentModal } from "@/components/companies/EnrichmentModal";
import { useApi } from "@/hooks/useApi";
import type { Company, CompanyCreate } from "@/types/crm";
import type { EnrichmentResponse, EnrichmentField } from "@/types/enrichment";

const companySizes = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5001+",
];

export function CompanyFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [formData, setFormData] = useState<CompanyCreate>({
    name: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showEnrichModal, setShowEnrichModal] = useState(false);
  const [enrichmentData, setEnrichmentData] = useState<EnrichmentResponse | null>(null);
  const [enrichmentError, setEnrichmentError] = useState<string | null>(null);

  const { get: getCompany, isLoading: loadingCompany } = useApi<Company>();
  const { post, put, isLoading: saving } = useApi<Company>();
  const { post: enrichCompany, isLoading: isEnriching, error: enrichApiError } = useApi<EnrichmentResponse>();

  const loadData = useCallback(async () => {
    if (id) {
      const company = await getCompany(`/companies/${id}`);
      if (company) {
        setFormData({
          name: company.name,
          domain: company.domain,
          industry: company.industry,
          size: company.size,
          description: company.description,
          website: company.website,
          phone: company.phone,
          address: company.address,
          city: company.city,
          state: company.state,
          country: company.country,
          postal_code: company.postal_code,
        });
      }
    }
  }, [id, getCompany]);

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

    if (!formData.name.trim()) {
      newErrors.name = "Company name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    let result;
    if (isEditing) {
      result = await put(`/companies/${id}`, formData);
    } else {
      result = await post("/companies", formData);
    }

    if (result) {
      navigate("/companies");
    }
  };

  const handleEnrich = async () => {
    if (!id) return;

    setEnrichmentError(null);
    setEnrichmentData(null);
    setShowEnrichModal(true);

    const result = await enrichCompany(`/companies/${id}/enrich`, {});
    if (result) {
      setEnrichmentData(result);
    }
    // Note: enrichApiError from useApi will be set on failure and passed to modal
  };

  const handleApplyEnrichment = (selectedFields: EnrichmentField[]) => {
    const updates: Partial<CompanyCreate> = {};

    for (const field of selectedFields) {
      if (field.suggested_value) {
        (updates as Record<string, string>)[field.field_name] = field.suggested_value;
      }
    }

    setFormData((prev) => ({ ...prev, ...updates }));
  };

  if (loadingCompany && isEditing) {
    return <div className="flex justify-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isEditing ? "Edit Company" : "New Company"}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Update company information" : "Add a new company to your CRM"}
            </p>
          </div>
        </div>
        {isEditing && (
          <Button
            type="button"
            variant="outline"
            onClick={handleEnrich}
            disabled={isEnriching}
          >
            <Wand2 className="mr-2 h-4 w-4" />
            {isEnriching ? "Enriching..." : "Enrich with AI"}
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
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
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  name="domain"
                  value={formData.domain || ""}
                  onChange={handleChange}
                  placeholder="e.g., example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  name="website"
                  value={formData.website || ""}
                  onChange={handleChange}
                  placeholder="https://example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    name="industry"
                    value={formData.industry || ""}
                    onChange={handleChange}
                    placeholder="e.g., Technology"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="size">Company Size</Label>
                  <select
                    id="size"
                    name="size"
                    value={formData.size || ""}
                    onChange={handleChange}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Select size</option>
                    {companySizes.map((size) => (
                      <option key={size} value={size}>
                        {size} employees
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone || ""}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address || ""}
                  onChange={handleChange}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city || ""}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    name="state"
                    value={formData.state || ""}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    name="country"
                    value={formData.country || ""}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    name="postal_code"
                    value={formData.postal_code || ""}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="description"
                name="description"
                value={formData.description || ""}
                onChange={handleChange}
                placeholder="Add a description about this company..."
                rows={4}
              />
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/companies")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Company"}
          </Button>
        </div>
      </form>

      <EnrichmentModal
        open={showEnrichModal}
        onOpenChange={setShowEnrichModal}
        enrichmentData={enrichmentData}
        isLoading={isEnriching}
        error={enrichmentError || enrichApiError}
        onApply={handleApplyEnrichment}
      />
    </div>
  );
}
