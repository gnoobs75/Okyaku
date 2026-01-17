/**
 * Performance monitoring types
 */

export interface SystemMetrics {
  cpu_percent: number;
  memory_total_gb: number;
  memory_used_gb: number;
  memory_percent: number;
  disk_total_gb: number;
  disk_used_gb: number;
  disk_percent: number;
  platform: string;
  python_version: string;
}

export interface DatabaseMetrics {
  status: "healthy" | "unhealthy";
  connection_time_ms: number;
  active_connections?: number;
}

export interface ModelInfo {
  name: string;
  size: number;
  size_vram?: number;
  digest?: string;
  details?: Record<string, unknown>;
  expires_at?: string;
}

export interface OllamaMetrics {
  status: "healthy" | "unhealthy" | "unavailable";
  url: string;
  models_available: string[];
  models_loaded: ModelInfo[];
  total_vram_used: number;
  total_vram_used_gb: number;
  gpu_available: boolean;
  error?: string;
}

export interface ApplicationMetrics {
  uptime_seconds: number;
  startup_time_ms: number;
  requests_total: number;
  errors_total: number;
  error_rate_percent: number;
  avg_response_time_ms: number;
  p50_response_time_ms: number;
  p95_response_time_ms: number;
  ai_avg_response_time_ms: number;
}

export interface PerformanceMetrics {
  timestamp: string;
  app_name: string;
  app_version: string;
  overall_status: "healthy" | "degraded" | "unhealthy";
  system: SystemMetrics;
  database: DatabaseMetrics;
  ollama: OllamaMetrics;
  application: ApplicationMetrics;
  warnings: string[];
}

export interface WarmupResult {
  success: boolean;
  total_time_ms: number;
  models: {
    llm: {
      status: string;
      time_ms: number;
      model?: string;
      error?: string;
    };
    embedding: {
      status: string;
      time_ms: number;
      model?: string;
      error?: string;
    };
  };
}

export interface UnloadResult {
  success: boolean;
  unloaded: string[];
  errors: Array<{ model: string; error: string }>;
  error?: string;
}
