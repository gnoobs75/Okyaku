import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Mode = "login" | "register";

export function LoginPage() {
  const { isAuthenticated, login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    let result;
    if (mode === "login") {
      result = await login(username, password);
    } else {
      result = await register(username, email, password, name || undefined);
    }

    if (!result.success) {
      setError(result.error || "An error occurred");
    }
    setIsLoading(false);
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Okyaku CRM</CardTitle>
          <p className="text-muted-foreground mt-2">
            {mode === "login" ? "Sign in to your account" : "Create a new account"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autoComplete="username"
              />
            </div>

            {mode === "register" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name (optional)</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    autoComplete="name"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
                ? "Please wait..."
                : mode === "login"
                ? "Sign In"
                : "Create Account"}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              </span>
              <button
                type="button"
                onClick={toggleMode}
                className="text-primary hover:underline font-medium"
              >
                {mode === "login" ? "Register" : "Sign In"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
