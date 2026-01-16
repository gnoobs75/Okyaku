import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { TutorialPanel } from "@/components/tutorial";
import { useTutorial } from "@/context/TutorialContext";
import { getTutorialForStage } from "@/content/tutorials";

export function SettingsPage() {
  const { user } = useAuth();
  const { tutorialMode } = useTutorial();
  const tutorial = getTutorialForStage("settings");

  return (
    <div className="space-y-6">
      {tutorialMode && tutorial && (
        <TutorialPanel tutorial={tutorial} stageId="settings" />
      )}

      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Username</label>
            <p className="text-muted-foreground">{user?.username}</p>
          </div>
          <div>
            <label className="text-sm font-medium">User ID</label>
            <p className="text-muted-foreground text-xs">{user?.userId}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
