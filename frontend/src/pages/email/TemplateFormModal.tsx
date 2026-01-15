import { useState, useEffect } from "react";
import { X, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor, PersonalizationTokens } from "@/components/RichTextEditor";
import { useApi } from "@/hooks/useApi";
import type { EmailTemplate, EmailTemplateCreate } from "@/types/email";

interface TemplateFormModalProps {
  template: EmailTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}

export function TemplateFormModal({
  template,
  onClose,
  onSaved,
}: TemplateFormModalProps) {
  const [name, setName] = useState(template?.name || "");
  const [subject, setSubject] = useState(template?.subject || "");
  const [htmlContent, setHtmlContent] = useState(template?.html_content || "");
  const [textContent, setTextContent] = useState(template?.text_content || "");
  const [description, setDescription] = useState(template?.description || "");
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = Boolean(template?.id);

  const { post: createTemplate } = useApi<EmailTemplate>();
  const { patch: updateTemplate } = useApi<EmailTemplate>();

  const handleInsertToken = (token: string) => {
    setHtmlContent((prev) => prev + token);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data: EmailTemplateCreate = {
        name,
        subject,
        html_content: htmlContent,
        text_content: textContent || undefined,
        description: description || undefined,
      };

      if (isEditing && template?.id) {
        await updateTemplate(`/email/templates/${template.id}`, data);
      } else {
        await createTemplate("/email/templates", data);
      }

      onSaved();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {isEditing ? "Edit Template" : "New Template"}
          </h2>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !name || !subject}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Template
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Welcome Email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject Line *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Welcome to {{company}}!"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this template"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Email Content (HTML)</Label>
              <PersonalizationTokens onInsert={handleInsertToken} />
            </div>
            <RichTextEditor
              content={htmlContent}
              onChange={setHtmlContent}
              placeholder="Write your email content here..."
              className="min-h-[300px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="text-content">Plain Text Version (Optional)</Label>
            <Textarea
              id="text-content"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Plain text version for email clients that don't support HTML"
              rows={6}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
