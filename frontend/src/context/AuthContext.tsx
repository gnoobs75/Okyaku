import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

interface User {
  id: string;
  username: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  getAccessToken: () => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "okyaku_token";
const USER_KEY = "okyaku_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.detail || "Login failed" };
      }

      const data = await response.json();

      // Save to state and localStorage
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));

      return { success: true };
    } catch (err) {
      return { success: false, error: "Network error. Please try again." };
    }
  }, []);

  const register = useCallback(async (username: string, email: string, password: string, name?: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password, name }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.detail || "Registration failed" };
      }

      const data = await response.json();

      // Save to state and localStorage
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));

      return { success: true };
    } catch (err) {
      return { success: false, error: "Network error. Please try again." };
    }
  }, []);

  const getAccessToken = useCallback(async () => {
    return token;
  }, [token]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        getAccessToken,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
