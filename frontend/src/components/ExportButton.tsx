import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExport, type EntityType } from "@/hooks/useExport";

interface ExportButtonProps {
  entityType: EntityType;
  status?: string;
  industry?: string;
  pipelineId?: string;
  stageId?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ExportButton({
  entityType,
  status,
  industry,
  pipelineId,
  stageId,
  variant = "outline",
  size = "default",
}: ExportButtonProps) {
  const { exportToCSV, isExporting } = useExport();

  const handleExport = async () => {
    await exportToCSV(entityType, {
      status,
      industry,
      pipeline_id: pipelineId,
      stage_id: stageId,
    });
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isExporting}
    >
      {isExporting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Export CSV
    </Button>
  );
}
