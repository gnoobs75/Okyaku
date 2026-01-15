import { useCallback, useState } from "react";
import { useAuth } from "@/context/AuthContext";

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export function useApi<T = unknown>() {
  const { getAccessToken } = useAuth();
  const [state, setState] = useState<ApiResponse<T>>({
    data: null,
    error: null,
    isLoading: false,
  });

  const request = useCallback(
    async (endpoint: string, options: ApiOptions = {}): Promise<T | null> => {
      setState({ data: null, error: null, isLoading: true });

      try {
        const token = await getAccessToken();

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...options.headers,
        };

        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: options.method || "GET",
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage =
            errorData.error?.message || `Request failed with status ${response.status}`;
          setState({ data: null, error: errorMessage, isLoading: false });
          return null;
        }

        // Handle 204 No Content
        if (response.status === 204) {
          setState({ data: null, error: null, isLoading: false });
          return null;
        }

        const data = await response.json();
        setState({ data, error: null, isLoading: false });
        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An error occurred";
        setState({ data: null, error: errorMessage, isLoading: false });
        return null;
      }
    },
    [getAccessToken]
  );

  const get = useCallback(
    (endpoint: string) => request(endpoint, { method: "GET" }),
    [request]
  );

  const post = useCallback(
    (endpoint: string, body: unknown) => request(endpoint, { method: "POST", body }),
    [request]
  );

  const put = useCallback(
    (endpoint: string, body: unknown) => request(endpoint, { method: "PUT", body }),
    [request]
  );

  const patch = useCallback(
    (endpoint: string, body: unknown) => request(endpoint, { method: "PATCH", body }),
    [request]
  );

  const del = useCallback(
    (endpoint: string) => request(endpoint, { method: "DELETE" }),
    [request]
  );

  return {
    ...state,
    request,
    get,
    post,
    put,
    patch,
    delete: del,
  };
}
