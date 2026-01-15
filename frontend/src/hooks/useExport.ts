import { useCallback, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export type EntityType = "contacts" | "companies" | "deals";

interface ExportParams {
  fields?: string[];
  status?: string;
  industry?: string;
  pipeline_id?: string;
  stage_id?: string;
  created_from?: string;
  created_to?: string;
}

export function useExport() {
  const { getAccessToken } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportToCSV = useCallback(
    async (entityType: EntityType, params: ExportParams = {}) => {
      setIsExporting(true);
      setError(null);

      try {
        const token = await getAccessToken();
        const searchParams = new URLSearchParams();

        if (params.fields?.length) {
          searchParams.set("fields", params.fields.join(","));
        }
        if (params.status) {
          searchParams.set("status", params.status);
        }
        if (params.industry) {
          searchParams.set("industry", params.industry);
        }
        if (params.pipeline_id) {
          searchParams.set("pipeline_id", params.pipeline_id);
        }
        if (params.stage_id) {
          searchParams.set("stage_id", params.stage_id);
        }
        if (params.created_from) {
          searchParams.set("created_from", params.created_from);
        }
        if (params.created_to) {
          searchParams.set("created_to", params.created_to);
        }

        const queryString = searchParams.toString();
        const url = `${API_BASE_URL}/exports/${entityType}${queryString ? `?${queryString}` : ""}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Export failed with status ${response.status}`);
        }

        // Get the filename from the Content-Disposition header
        const contentDisposition = response.headers.get("Content-Disposition");
        let filename = `${entityType}_export.csv`;
        if (contentDisposition) {
          const match = contentDisposition.match(/filename=(.+)/);
          if (match) {
            filename = match[1];
          }
        }

        // Create blob and download
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);

        setIsExporting(false);
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Export failed";
        setError(errorMessage);
        setIsExporting(false);
        return false;
      }
    },
    [getAccessToken]
  );

  const getExportFields = useCallback(
    async (entityType: EntityType): Promise<string[]> => {
      try {
        const token = await getAccessToken();
        const response = await fetch(
          `${API_BASE_URL}/exports/fields/${entityType}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch export fields");
        }

        const data = await response.json();
        return data.fields || [];
      } catch {
        return [];
      }
    },
    [getAccessToken]
  );

  return {
    exportToCSV,
    getExportFields,
    isExporting,
    error,
  };
}
