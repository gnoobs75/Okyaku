import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface TutorialContextType {
  tutorialMode: boolean;
  toggleTutorialMode: () => void;
  enableTutorialMode: () => void;
  disableTutorialMode: () => void;
  dismissedTutorials: Set<string>;
  dismissTutorial: (stageId: string) => void;
  restoreTutorial: (stageId: string) => void;
  resetAllDismissed: () => void;
  isTutorialDismissed: (stageId: string) => boolean;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

const TUTORIAL_MODE_KEY = "okyaku_tutorial_mode";
const DISMISSED_TUTORIALS_KEY = "okyaku_dismissed_tutorials";

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [tutorialMode, setTutorialMode] = useState(true);
  const [dismissedTutorials, setDismissedTutorials] = useState<Set<string>>(new Set());

  // Load saved state on mount
  useEffect(() => {
    const savedMode = localStorage.getItem(TUTORIAL_MODE_KEY);
    const savedDismissed = localStorage.getItem(DISMISSED_TUTORIALS_KEY);

    // Default to ON for new users (no saved preference)
    if (savedMode !== null) {
      setTutorialMode(savedMode === "true");
    }

    if (savedDismissed) {
      try {
        const parsed = JSON.parse(savedDismissed);
        if (Array.isArray(parsed)) {
          setDismissedTutorials(new Set(parsed));
        }
      } catch {
        // Invalid data, reset
        localStorage.removeItem(DISMISSED_TUTORIALS_KEY);
      }
    }
  }, []);

  // Save tutorial mode when it changes
  useEffect(() => {
    localStorage.setItem(TUTORIAL_MODE_KEY, String(tutorialMode));
  }, [tutorialMode]);

  // Save dismissed tutorials when they change
  useEffect(() => {
    localStorage.setItem(
      DISMISSED_TUTORIALS_KEY,
      JSON.stringify(Array.from(dismissedTutorials))
    );
  }, [dismissedTutorials]);

  const toggleTutorialMode = useCallback(() => {
    setTutorialMode((prev) => !prev);
  }, []);

  const enableTutorialMode = useCallback(() => {
    setTutorialMode(true);
  }, []);

  const disableTutorialMode = useCallback(() => {
    setTutorialMode(false);
  }, []);

  const dismissTutorial = useCallback((stageId: string) => {
    setDismissedTutorials((prev) => {
      const next = new Set(prev);
      next.add(stageId);
      return next;
    });
  }, []);

  const restoreTutorial = useCallback((stageId: string) => {
    setDismissedTutorials((prev) => {
      const next = new Set(prev);
      next.delete(stageId);
      return next;
    });
  }, []);

  const resetAllDismissed = useCallback(() => {
    setDismissedTutorials(new Set());
  }, []);

  const isTutorialDismissed = useCallback(
    (stageId: string) => {
      return dismissedTutorials.has(stageId);
    },
    [dismissedTutorials]
  );

  return (
    <TutorialContext.Provider
      value={{
        tutorialMode,
        toggleTutorialMode,
        enableTutorialMode,
        disableTutorialMode,
        dismissedTutorials,
        dismissTutorial,
        restoreTutorial,
        resetAllDismissed,
        isTutorialDismissed,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
}
