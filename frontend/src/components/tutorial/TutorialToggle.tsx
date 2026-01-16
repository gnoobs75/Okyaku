import { BookOpen, BookX, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTutorial } from "@/context/TutorialContext";

export function TutorialToggle() {
  const {
    tutorialMode,
    toggleTutorialMode,
    dismissedTutorials,
    resetAllDismissed,
  } = useTutorial();

  const dismissedCount = dismissedTutorials.size;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-9 w-9 ${
            tutorialMode
              ? "text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              : "text-muted-foreground"
          }`}
          title={tutorialMode ? "Tutorial Mode: ON" : "Tutorial Mode: OFF"}
        >
          {tutorialMode ? (
            <BookOpen className="h-5 w-5" />
          ) : (
            <BookX className="h-5 w-5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={toggleTutorialMode}>
          {tutorialMode ? (
            <>
              <BookX className="mr-2 h-4 w-4" />
              <span>Hide Tutorials</span>
            </>
          ) : (
            <>
              <BookOpen className="mr-2 h-4 w-4" />
              <span>Show Tutorials</span>
            </>
          )}
        </DropdownMenuItem>

        {dismissedCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={resetAllDismissed}>
              <RotateCcw className="mr-2 h-4 w-4" />
              <span>Restore {dismissedCount} Hidden Tutorial{dismissedCount !== 1 ? 's' : ''}</span>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          Tutorials help you learn the app. You can dismiss individual
          tutorials on each screen.
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
