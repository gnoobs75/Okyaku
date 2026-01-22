import { useState, useEffect, useRef } from "react";
import { ExternalLink, Check, X, Loader2, Sparkles, Terminal, ChevronDown, ChevronUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  EnrichmentResponse,
  EnrichmentField,
  getConfidenceLabel,
  getConfidenceBadgeClass,
  fieldLabels,
} from "@/types/enrichment";

interface EnrichmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrichmentData: EnrichmentResponse | null;
  isLoading: boolean;
  error: string | null;
  onApply: (selectedFields: EnrichmentField[]) => void;
}

export function EnrichmentModal({
  open,
  onOpenChange,
  enrichmentData,
  isLoading,
  error,
  onApply,
}: EnrichmentModalProps) {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [showLogs, setShowLogs] = useState(true); // Show logs by default for debugging
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-select high-confidence fields when data loads
  useEffect(() => {
    if (enrichmentData?.fields) {
      const highConfidenceFields = new Set(
        enrichmentData.fields
          .filter((f) => f.confidence >= 0.7)
          .map((f) => f.field_name)
      );
      setSelectedFields(highConfidenceFields);
    }
  }, [enrichmentData]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (showLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [enrichmentData?.logs, showLogs]);

  const toggleField = (fieldName: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldName)) {
        next.delete(fieldName);
      } else {
        next.add(fieldName);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (enrichmentData?.fields) {
      setSelectedFields(new Set(enrichmentData.fields.map((f) => f.field_name)));
    }
  };

  const handleSelectNone = () => {
    setSelectedFields(new Set());
  };

  const handleApply = () => {
    if (enrichmentData?.fields) {
      const fieldsToApply = enrichmentData.fields.filter((f) =>
        selectedFields.has(f.field_name)
      );
      onApply(fieldsToApply);
      onOpenChange(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center">
            <p className="font-medium">Enriching company data...</p>
            <p className="text-sm text-muted-foreground">
              Searching the web and extracting information
            </p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="rounded-full bg-red-100 p-3">
            <X className="h-6 w-6 text-red-600" />
          </div>
          <div className="text-center">
            <p className="font-medium text-red-600">Enrichment failed</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      );
    }

    if (!enrichmentData?.success) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="rounded-full bg-yellow-100 p-3">
            <Sparkles className="h-6 w-6 text-yellow-600" />
          </div>
          <div className="text-center">
            <p className="font-medium">No enrichment data found</p>
            <p className="text-sm text-muted-foreground">
              {enrichmentData?.error || "Could not find additional information for this company"}
            </p>
          </div>
        </div>
      );
    }

    if (!enrichmentData.fields.length) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="rounded-full bg-green-100 p-3">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <div className="text-center">
            <p className="font-medium">Company data is up to date</p>
            <p className="text-sm text-muted-foreground">
              No new information found to enrich
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Found {enrichmentData.fields.length} fields from {enrichmentData.sources_searched} sources
          </span>
          <div className="space-x-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-primary hover:underline"
            >
              Select all
            </button>
            <span className="text-muted-foreground">|</span>
            <button
              type="button"
              onClick={handleSelectNone}
              className="text-primary hover:underline"
            >
              Select none
            </button>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
          {enrichmentData.fields.map((field) => (
            <div
              key={field.field_name}
              className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                selectedFields.has(field.field_name)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => toggleField(field.field_name)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <div
                    className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                      selectedFields.has(field.field_name)
                        ? "border-primary bg-primary"
                        : "border-gray-300"
                    }`}
                  >
                    {selectedFields.has(field.field_name) && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-medium">
                      {fieldLabels[field.field_name] || field.field_name}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${getConfidenceBadgeClass(
                        field.confidence
                      )}`}
                    >
                      {getConfidenceLabel(field.confidence)}
                    </span>
                  </div>
                  {field.current_value && (
                    <div className="text-sm text-muted-foreground mb-1">
                      <span className="text-xs uppercase tracking-wide">Current:</span>{" "}
                      <span className="line-through">{field.current_value}</span>
                    </div>
                  )}
                  <div className="text-sm">
                    <span className="text-xs uppercase tracking-wide text-green-600">
                      Suggested:
                    </span>{" "}
                    <span className="font-medium">{field.suggested_value}</span>
                  </div>
                  {field.source_url && (
                    <a
                      href={field.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                      View source
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogClose onClick={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Company Enrichment
          </DialogTitle>
          <DialogDescription>
            Review AI-suggested data and select which fields to apply to the company.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">{renderContent()}</div>

        {/* Verbose Logs Panel */}
        <div className="border-t pt-4">
          <button
            type="button"
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <Terminal className="h-4 w-4" />
            <span>Debug Logs</span>
            {showLogs ? (
              <ChevronUp className="h-4 w-4 ml-auto" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-auto" />
            )}
            {enrichmentData?.logs && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                {enrichmentData.logs.length} entries
              </span>
            )}
          </button>

          {showLogs && (
            <div className="mt-3 bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-xs max-h-[200px] overflow-y-auto">
              {isLoading && !enrichmentData?.logs?.length && (
                <div className="text-gray-400 animate-pulse">
                  Waiting for logs...
                </div>
              )}
              {enrichmentData?.logs?.map((log, index) => (
                <div
                  key={index}
                  className={`py-0.5 ${
                    log.includes("[ERROR]")
                      ? "text-red-400"
                      : log.includes("[START]") || log.includes("[DONE]")
                      ? "text-green-400"
                      : log.includes("[LLM]")
                      ? "text-purple-400"
                      : log.includes("[FETCH]")
                      ? "text-blue-400"
                      : log.includes("[SEARCH]")
                      ? "text-yellow-400"
                      : "text-gray-300"
                  }`}
                >
                  {log}
                </div>
              ))}
              {!isLoading && !enrichmentData?.logs?.length && (
                <div className="text-gray-500">No logs available</div>
              )}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {enrichmentData?.success && enrichmentData.fields.length > 0 && (
            <Button
              onClick={handleApply}
              disabled={selectedFields.size === 0}
            >
              Apply {selectedFields.size} field{selectedFields.size !== 1 ? "s" : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
