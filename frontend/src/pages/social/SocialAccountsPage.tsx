import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Linkedin,
  Twitter,
  Facebook,
  RefreshCw,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TutorialPanel } from "@/components/tutorial";
import { useApi } from "@/hooks/useApi";
import { useTutorial } from "@/context/TutorialContext";
import { getTutorialForStage } from "@/content/tutorials";
import type { SocialAccount, SocialPlatform, AccountStatus } from "@/types/social";

const platformIcons: Record<SocialPlatform, typeof Linkedin> = {
  linkedin: Linkedin,
  twitter: Twitter,
  facebook: Facebook,
};

const platformColors: Record<SocialPlatform, string> = {
  linkedin: "bg-blue-600",
  twitter: "bg-sky-500",
  facebook: "bg-blue-500",
};

const statusColors: Record<AccountStatus, string> = {
  connected: "bg-green-100 text-green-800",
  disconnected: "bg-gray-100 text-gray-800",
  token_expired: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
};

const statusIcons: Record<AccountStatus, typeof CheckCircle> = {
  connected: CheckCircle,
  disconnected: XCircle,
  token_expired: AlertCircle,
  error: XCircle,
};

export function SocialAccountsPage() {
  const { tutorialMode } = useTutorial();
  const tutorial = getTutorialForStage("social-accounts");
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<string | null>(null);

  const { get, isLoading } = useApi<SocialAccount[]>();
  const { post: refreshToken } = useApi<{ status: string }>();
  const { delete: deleteAccount } = useApi<void>();

  const loadAccounts = useCallback(async () => {
    const result = await get("/social/accounts");
    if (result) {
      setAccounts(result);
    }
  }, [get]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleRefresh = async (account: SocialAccount) => {
    setIsRefreshing(account.id);
    try {
      await refreshToken(`/social/accounts/${account.id}/refresh`, {});
      loadAccounts();
    } finally {
      setIsRefreshing(null);
    }
  };

  const handleDelete = async (account: SocialAccount) => {
    if (
      !confirm(
        `Disconnect ${account.platform_username}? All scheduled posts for this account will be deleted.`
      )
    ) {
      return;
    }
    await deleteAccount(`/social/accounts/${account.id}`);
    loadAccounts();
  };

  const handleConnect = (platform: SocialPlatform) => {
    // In a real app, this would redirect to OAuth flow
    alert(
      `This would redirect to ${platform} OAuth flow. Configure OAuth credentials in environment variables.`
    );
  };

  return (
    <div className="space-y-6">
      {tutorialMode && tutorial && (
        <TutorialPanel tutorial={tutorial} stageId="social-accounts" />
      )}

      <div className="flex items-center gap-4">
        <Link to="/social">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Social Media Accounts</h1>
          <p className="text-muted-foreground">
            Connect and manage your social media accounts
          </p>
        </div>
      </div>

      {/* Connect New Account */}
      <Card>
        <CardHeader>
          <CardTitle>Connect New Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button
              variant="outline"
              className="h-auto py-4 px-6"
              onClick={() => handleConnect("linkedin")}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                  <Linkedin className="h-6 w-6 text-white" />
                </div>
                <span>LinkedIn</span>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 px-6"
              onClick={() => handleConnect("twitter")}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-sky-500 flex items-center justify-center">
                  <Twitter className="h-6 w-6 text-white" />
                </div>
                <span>X (Twitter)</span>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 px-6"
              onClick={() => handleConnect("facebook")}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                  <Facebook className="h-6 w-6 text-white" />
                </div>
                <span>Facebook</span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connected Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No accounts connected yet. Connect your first social media account
              above.
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => {
                const Icon = platformIcons[account.platform];
                const StatusIcon = statusIcons[account.status];
                return (
                  <div
                    key={account.id}
                    className="flex items-center gap-4 p-4 border rounded-lg"
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        platformColors[account.platform]
                      }`}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {account.display_name || account.platform_username}
                        </p>
                        <Badge className={statusColors[account.status]}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {account.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        @{account.platform_username} · {account.platform}
                      </p>
                      {account.error_message && (
                        <p className="text-sm text-red-600 mt-1">
                          {account.error_message}
                        </p>
                      )}
                      {account.token_expires_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Token expires:{" "}
                          {new Date(account.token_expires_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {account.status === "token_expired" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRefresh(account)}
                          disabled={isRefreshing === account.id}
                        >
                          <RefreshCw
                            className={`mr-1 h-4 w-4 ${
                              isRefreshing === account.id ? "animate-spin" : ""
                            }`}
                          />
                          Refresh
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(account)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Disconnect
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
