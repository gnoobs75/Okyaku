import { Link } from "react-router-dom";
import { Calendar, BarChart2, Inbox, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TutorialPanel } from "@/components/tutorial";
import { useTutorial } from "@/context/TutorialContext";
import { getTutorialForStage } from "@/content/tutorials";
import { AIContentAssistant } from "@/components/social/AIContentAssistant";

export function AIContentPage() {
  const { tutorialMode } = useTutorial();
  const tutorial = getTutorialForStage("ai-content");

  return (
    <div className="space-y-6">
      {tutorialMode && tutorial && (
        <TutorialPanel tutorial={tutorial} stageId="ai-content" />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Content Studio</h1>
          <p className="text-muted-foreground">
            Generate, improve, and adapt social media content using AI
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/social">
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Calendar
            </Button>
          </Link>
          <Link to="/social/analytics">
            <Button variant="outline">
              <BarChart2 className="mr-2 h-4 w-4" />
              Analytics
            </Button>
          </Link>
          <Link to="/social/inbox">
            <Button variant="outline">
              <Inbox className="mr-2 h-4 w-4" />
              Inbox
            </Button>
          </Link>
          <Link to="/social/accounts">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Accounts
            </Button>
          </Link>
        </div>
      </div>

      {/* AI Content Assistant */}
      <AIContentAssistant />
    </div>
  );
}
