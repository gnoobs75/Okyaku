import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Send,
  Clock,
  Users,
  Eye,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor, PersonalizationTokens } from "@/components/RichTextEditor";
import { useApi } from "@/hooks/useApi";
import type {
  EmailCampaign,
  EmailCampaignCreate,
  EmailTemplate,
  ContactStatus,
} from "@/types/email";

export function CampaignFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [trackOpens, setTrackOpens] = useState(true);
  const [trackClicks, setTrackClicks] = useState(true);

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [recipientCount, setRecipientCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const { get: getCampaign } = useApi<EmailCampaign>();
  const { get: getTemplates } = useApi<EmailTemplate[]>();
  const { post: createCampaign } = useApi<EmailCampaign>();
  const { patch: updateCampaign } = useApi<EmailCampaign>();
  const { post: populateRecipients } = useApi<{ added_count: number }>();
  const { post: sendCampaign } = useApi<{ status: string }>();
  const { post: scheduleCampaign } = useApi<{ status: string }>();

  const loadTemplates = useCallback(async () => {
    const result = await getTemplates("/email/templates");
    if (result) {
      setTemplates(result);
    }
  }, [getTemplates]);

  const loadCampaign = useCallback(async () => {
    if (!id) return;
    const result = await getCampaign(`/email/campaigns/${id}`);
    if (result) {
      setName(result.name);
      setDescription(result.description || "");
      setTemplateId(result.template_id);
      setSubject(result.subject || "");
      if (result.scheduled_at) {
        setScheduledAt(result.scheduled_at.slice(0, 16));
      }
      setTrackOpens(result.track_opens);
      setTrackClicks(result.track_clicks);
      if (result.recipient_filter?.status) {
        setStatusFilter(result.recipient_filter.status as string);
      }
    }
  }, [id, getCampaign]);

  useEffect(() => {
    loadTemplates();
    if (isEditing) {
      loadCampaign();
    }
  }, [loadTemplates, loadCampaign, isEditing]);

  useEffect(() => {
    if (templateId && templates.length > 0) {
      const template = templates.find((t) => t.id === templateId);
      setSelectedTemplate(template || null);
      if (template && !subject) {
        setSubject(template.subject);
      }
    }
  }, [templateId, templates, subject]);

  const handleTemplateChange = (newTemplateId: string) => {
    setTemplateId(newTemplateId);
    const template = templates.find((t) => t.id === newTemplateId);
    if (template) {
      setSelectedTemplate(template);
      setSubject(template.subject);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data: EmailCampaignCreate = {
        name,
        description: description || undefined,
        template_id: templateId,
        subject: subject || undefined,
        recipient_filter: statusFilter ? { status: statusFilter } : {},
        track_opens: trackOpens,
        track_clicks: trackClicks,
      };

      if (isEditing) {
        await updateCampaign(`/email/campaigns/${id}`, data);
      } else {
        const result = await createCampaign("/email/campaigns", data);
        if (result) {
          navigate(`/email/campaigns/${result.id}`);
          return;
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePopulateRecipients = async () => {
    if (!id) return;
    const result = await populateRecipients(`/email/campaigns/${id}/populate-recipients`, {});
    if (result) {
      setRecipientCount(result.added_count);
    }
  };

  const handleSchedule = async () => {
    if (!id || !scheduledAt) return;
    await scheduleCampaign(
      `/email/campaigns/${id}/schedule?scheduled_at=${new Date(scheduledAt).toISOString()}`,
      {}
    );
    navigate("/email/campaigns");
  };

  const handleSendNow = async () => {
    if (!id) return;
    setIsSending(true);
    try {
      await sendCampaign(`/email/campaigns/${id}/send`, {});
      navigate("/email/campaigns");
    } finally {
      setIsSending(false);
    }
  };

  const handlePreview = () => {
    if (!selectedTemplate) return;
    // Simple preview with sample data
    let html = selectedTemplate.html_content;
    html = html.replace(/\{\{first_name\}\}/g, "John");
    html = html.replace(/\{\{last_name\}\}/g, "Doe");
    html = html.replace(/\{\{email\}\}/g, "john@example.com");
    html = html.replace(/\{\{company\}\}/g, "Acme Inc");
    html = html.replace(/\{\{job_title\}\}/g, "CEO");
    setPreviewHtml(html);
    setShowPreview(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/email/campaigns")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">
            {isEditing ? "Edit Campaign" : "New Campaign"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing
              ? "Update your email campaign settings"
              : "Create a new email marketing campaign"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePreview} disabled={!selectedTemplate}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name || !templateId}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Monthly Newsletter - January"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this campaign"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template">Email Template *</Label>
                <Select
                  id="template"
                  value={templateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                >
                  <option value="">Select a template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject line (overrides template)"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use the template's default subject
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recipients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Recipients
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status-filter">Contact Status Filter</Label>
                <Select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Contacts</option>
                  <option value="lead">Leads</option>
                  <option value="prospect">Prospects</option>
                  <option value="customer">Customers</option>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Filter contacts by their status to target specific audiences
                </p>
              </div>

              {isEditing && (
                <div className="flex items-center gap-4">
                  <Button variant="outline" onClick={handlePopulateRecipients}>
                    <Users className="mr-2 h-4 w-4" />
                    Populate Recipients
                  </Button>
                  {recipientCount > 0 && (
                    <Badge variant="secondary">
                      {recipientCount} recipients added
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Template Preview */}
          {selectedTemplate && (
            <Card>
              <CardHeader>
                <CardTitle>Template Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md p-4 bg-white">
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: selectedTemplate.html_content,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tracking Options */}
          <Card>
            <CardHeader>
              <CardTitle>Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="track-opens"
                  checked={trackOpens}
                  onChange={(e) => setTrackOpens(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="track-opens">Track email opens</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="track-clicks"
                  checked={trackClicks}
                  onChange={(e) => setTrackClicks(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="track-clicks">Track link clicks</Label>
              </div>
            </CardContent>
          </Card>

          {/* Scheduling */}
          {isEditing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Scheduling
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduled-at">Schedule for</Label>
                  <Input
                    id="scheduled-at"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleSchedule}
                    disabled={!scheduledAt}
                    className="w-full"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Schedule
                  </Button>

                  <Button
                    variant="default"
                    onClick={handleSendNow}
                    disabled={isSending}
                    className="w-full"
                  >
                    {isSending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Send Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="font-semibold">Email Preview</h2>
              <Button variant="ghost" onClick={() => setShowPreview(false)}>
                Close
              </Button>
            </div>
            <div className="p-4">
              <div className="mb-4 p-2 bg-muted rounded">
                <p className="text-sm">
                  <strong>Subject:</strong> {subject || selectedTemplate?.subject}
                </p>
              </div>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
