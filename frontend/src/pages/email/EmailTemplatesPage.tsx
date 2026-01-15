import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Edit, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/useApi";
import type { EmailTemplate } from "@/types/email";
import { TemplateFormModal } from "./TemplateFormModal";

export function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

  const { get, isLoading } = useApi<EmailTemplate[]>();
  const { delete: deleteTemplate } = useApi<void>();

  const loadTemplates = useCallback(async () => {
    const result = await get("/email/templates");
    if (result) {
      setTemplates(result);
    }
  }, [get]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setShowModal(true);
  };

  const handleDelete = async (template: EmailTemplate) => {
    if (!confirm(`Delete template "${template.name}"?`)) return;
    await deleteTemplate(`/email/templates/${template.id}`);
    loadTemplates();
  };

  const handleDuplicate = (template: EmailTemplate) => {
    setEditingTemplate({
      ...template,
      id: "",
      name: `${template.name} (Copy)`,
    } as EmailTemplate);
    setShowModal(true);
  };

  const handleSaved = () => {
    setShowModal(false);
    setEditingTemplate(null);
    loadTemplates();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/email/campaigns">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Email Templates</h1>
          <p className="text-muted-foreground">
            Create and manage reusable email templates
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              No templates yet. Create your first template to get started.
            </p>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <Badge variant={template.is_active ? "default" : "secondary"}>
                    {template.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  Subject: {template.subject}
                </p>
                {template.description && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {template.description}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicate(template)}
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    Duplicate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(template)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <TemplateFormModal
          template={editingTemplate}
          onClose={() => {
            setShowModal(false);
            setEditingTemplate(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
