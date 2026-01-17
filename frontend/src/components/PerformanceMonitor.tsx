import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Cpu,
  Database,
  HardDrive,
  Server,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Loader2,
  Flame,
  Unplug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PerformanceMetrics } from "@/types/performance";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

interface PerformanceMonitorProps {
  refreshInterval?: number; // milliseconds, default 30000
  defaultExpanded?: boolean;
}

export function PerformanceMonitor({
  refreshInterval = 30000,
  defaultExpanded = false,
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [isUnloading, setIsUnloading] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/metrics`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setMetrics(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch metrics");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleWarmup = async () => {
    try {
      setIsWarmingUp(true);
      const response = await fetch(`${API_BASE_URL}/metrics/warmup`, {
        method: "POST",
      });
      if (response.ok) {
        // Refresh metrics after warmup
        await fetchMetrics();
      }
    } catch (err) {
      console.error("Warmup failed:", err);
    } finally {
      setIsWarmingUp(false);
    }
  };

  const handleUnload = async () => {
    try {
      setIsUnloading(true);
      const response = await fetch(`${API_BASE_URL}/metrics/unload`, {
        method: "POST",
      });
      if (response.ok) {
        // Refresh metrics after unload
        await fetchMetrics();
      }
    } catch (err) {
      console.error("Unload failed:", err);
    } finally {
      setIsUnloading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchMetrics, refreshInterval]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-500";
      case "degraded":
        return "text-yellow-500";
      case "unhealthy":
      case "unavailable":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "degraded":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "unhealthy":
      case "unavailable":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  };

  const formatUptime = (seconds: number) => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
  };

  // Compact view (collapsed)
  if (!isExpanded) {
    return (
      <div
        className={cn(
          "fixed bottom-4 right-4 z-50",
          "bg-card border rounded-lg shadow-lg cursor-pointer",
          "transition-all duration-200 hover:shadow-xl"
        )}
        onClick={() => setIsExpanded(true)}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : error ? (
            <XCircle className="h-4 w-4 text-red-500" />
          ) : metrics ? (
            getStatusIcon(metrics.overall_status)
          ) : (
            <Activity className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-xs font-medium">
            {metrics?.overall_status === "healthy"
              ? "All Systems OK"
              : metrics?.overall_status === "degraded"
              ? "Degraded"
              : error
              ? "Error"
              : "Loading..."}
          </span>
          {metrics?.ollama.gpu_available && (
            <Zap className="h-3 w-3 text-yellow-500" title="GPU Active" />
          )}
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Expanded view
  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50",
        "bg-card border rounded-lg shadow-xl",
        "w-80 max-h-[70vh] overflow-hidden",
        "transition-all duration-200"
      )}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b bg-muted/50 cursor-pointer"
        onClick={() => setIsExpanded(false)}
      >
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Performance Monitor</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              fetchMetrics();
            }}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
          </Button>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto max-h-[calc(70vh-48px)]">
        {error ? (
          <div className="p-4 text-center">
            <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={fetchMetrics}
            >
              Retry
            </Button>
          </div>
        ) : metrics ? (
          <div className="p-3 space-y-3">
            {/* Overall Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(metrics.overall_status)}
                <span
                  className={cn("text-sm font-medium", getStatusColor(metrics.overall_status))}
                >
                  {metrics.overall_status.charAt(0).toUpperCase() + metrics.overall_status.slice(1)}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                v{metrics.app_version}
              </span>
            </div>

            {/* Warnings */}
            {metrics.warnings.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md p-2">
                {metrics.warnings.map((warning, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-xs text-yellow-700 dark:text-yellow-400">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            )}

            {/* System Resources */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Server className="h-3 w-3" />
                <span>System Resources</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-between bg-muted/50 rounded px-2 py-1">
                  <div className="flex items-center gap-1">
                    <Cpu className="h-3 w-3" />
                    <span>CPU</span>
                  </div>
                  <span className={cn(
                    "font-mono",
                    metrics.system.cpu_percent > 80 ? "text-red-500" : ""
                  )}>
                    {metrics.system.cpu_percent.toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between bg-muted/50 rounded px-2 py-1">
                  <div className="flex items-center gap-1">
                    <HardDrive className="h-3 w-3" />
                    <span>RAM</span>
                  </div>
                  <span className={cn(
                    "font-mono",
                    metrics.system.memory_percent > 80 ? "text-red-500" : ""
                  )}>
                    {metrics.system.memory_percent.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Database */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Database className="h-3 w-3" />
                <span>Database</span>
              </div>
              <div className="flex items-center justify-between bg-muted/50 rounded px-2 py-1 text-xs">
                <div className="flex items-center gap-1.5">
                  {getStatusIcon(metrics.database.status)}
                  <span>PostgreSQL</span>
                </div>
                <span className="font-mono text-muted-foreground">
                  {metrics.database.connection_time_ms.toFixed(0)}ms
                </span>
              </div>
            </div>

            {/* Ollama / AI */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Zap className="h-3 w-3" />
                  <span>AI / Ollama</span>
                </div>
                {metrics.ollama.gpu_available && (
                  <span className="text-[10px] bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded">
                    GPU
                  </span>
                )}
              </div>
              <div className="bg-muted/50 rounded p-2 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {getStatusIcon(metrics.ollama.status)}
                    <span>Status</span>
                  </div>
                  <span className={cn("font-medium", getStatusColor(metrics.ollama.status))}>
                    {metrics.ollama.status}
                  </span>
                </div>
                {metrics.ollama.status === "healthy" && (
                  <>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">VRAM Used</span>
                      <span className="font-mono">
                        {metrics.ollama.total_vram_used_gb.toFixed(2)} GB
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Models Loaded</span>
                      <span className="font-mono">
                        {metrics.ollama.models_loaded.length}
                      </span>
                    </div>
                    {metrics.ollama.models_loaded.length > 0 && (
                      <div className="pt-1 border-t border-border/50">
                        {metrics.ollama.models_loaded.map((model, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                            <span className="text-muted-foreground truncate max-w-[120px]" title={model.name}>
                              {model.name}
                            </span>
                            <span className="font-mono text-muted-foreground">
                              {formatBytes(model.size_vram || 0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {metrics.ollama.error && (
                  <p className="text-xs text-red-500 mt-1">{metrics.ollama.error}</p>
                )}
              </div>

              {/* Model Controls */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={handleWarmup}
                  disabled={isWarmingUp || metrics.ollama.status !== "healthy"}
                >
                  {isWarmingUp ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Flame className="h-3 w-3 mr-1" />
                  )}
                  Warmup
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={handleUnload}
                  disabled={isUnloading || metrics.ollama.models_loaded.length === 0}
                >
                  {isUnloading ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Unplug className="h-3 w-3 mr-1" />
                  )}
                  Unload
                </Button>
              </div>
            </div>

            {/* Application Metrics */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Activity className="h-3 w-3" />
                <span>Application</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div className="bg-muted/50 rounded px-2 py-1">
                  <div className="text-muted-foreground">Requests</div>
                  <div className="font-mono">{metrics.application.requests_total}</div>
                </div>
                <div className="bg-muted/50 rounded px-2 py-1">
                  <div className="text-muted-foreground">Errors</div>
                  <div className={cn("font-mono", metrics.application.error_rate_percent > 5 ? "text-red-500" : "")}>
                    {metrics.application.error_rate_percent.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-muted/50 rounded px-2 py-1">
                  <div className="text-muted-foreground">Avg Response</div>
                  <div className="font-mono">{metrics.application.avg_response_time_ms.toFixed(0)}ms</div>
                </div>
                <div className="bg-muted/50 rounded px-2 py-1">
                  <div className="text-muted-foreground">AI Avg</div>
                  <div className="font-mono">{metrics.application.ai_avg_response_time_ms.toFixed(0)}ms</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 border-t text-xs text-muted-foreground text-center">
              {lastUpdated && (
                <span>Updated {lastUpdated.toLocaleTimeString()}</span>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">Loading metrics...</p>
          </div>
        )}
      </div>
    </div>
  );
}
