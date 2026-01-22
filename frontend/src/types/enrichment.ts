/**
 * Types for Company Enrichment AI feature.
 */

export interface EnrichmentField {
  field_name: string;
  current_value: string | null;
  suggested_value: string | null;
  confidence: number;
  source_url: string | null;
}

export interface EnrichmentResponse {
  success: boolean;
  company_id: string;
  company_name: string;
  fields: EnrichmentField[];
  sources_searched: number;
  error: string | null;
  logs: string[];  // Verbose logs for debugging
}

/**
 * Get confidence level label based on score.
 */
export function getConfidenceLevel(confidence: number): "high" | "medium" | "low" {
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.5) return "medium";
  return "low";
}

/**
 * Get display text for confidence level.
 */
export function getConfidenceLabel(confidence: number): string {
  const level = getConfidenceLevel(confidence);
  const percentage = Math.round(confidence * 100);
  switch (level) {
    case "high":
      return `High (${percentage}%)`;
    case "medium":
      return `Medium (${percentage}%)`;
    case "low":
      return `Low (${percentage}%)`;
  }
}

/**
 * Get CSS class for confidence badge.
 */
export function getConfidenceBadgeClass(confidence: number): string {
  const level = getConfidenceLevel(confidence);
  switch (level) {
    case "high":
      return "bg-green-100 text-green-800 border-green-200";
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "low":
      return "bg-red-100 text-red-800 border-red-200";
  }
}

/**
 * Field name to display label mapping.
 */
export const fieldLabels: Record<string, string> = {
  industry: "Industry",
  size: "Company Size",
  description: "Description",
  website: "Website",
  phone: "Phone",
  address: "Address",
  city: "City",
  state: "State/Province",
  country: "Country",
  postal_code: "Postal Code",
};
