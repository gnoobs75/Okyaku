import { useState } from "react";
import { GraduationCap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TutorialWizardModal } from "./TutorialWizardModal";
import type { StageTutorial } from "@/content/tutorials";
import { cn } from "@/lib/utils";

interface TutorialButtonProps {
  tutorial: StageTutorial;
  variant?: "default" | "subtle" | "prominent";
  className?: string;
}

export function TutorialButton({
  tutorial,
  variant = "default",
  className
}: TutorialButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {variant === "prominent" ? (
        <Button
          onClick={() => setIsModalOpen(true)}
          className={cn(
            "gap-2 bg-gradient-to-r from-[#C52638] to-[#E85A6B] hover:from-[#A51F2E] hover:to-[#C52638] text-white shadow-lg shadow-[#C52638]/25",
            className
          )}
        >
          <Sparkles className="h-4 w-4" />
          Take the Tour
        </Button>
      ) : variant === "subtle" ? (
        <button
          onClick={() => setIsModalOpen(true)}
          className={cn(
            "inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#C52638] transition-colors",
            className
          )}
        >
          <GraduationCap className="h-4 w-4" />
          <span>Tutorial</span>
        </button>
      ) : (
        <Button
          variant="outline"
          onClick={() => setIsModalOpen(true)}
          className={cn(
            "gap-2 border-[#C52638]/30 text-[#C52638] hover:bg-[#C52638]/5 hover:border-[#C52638]/50",
            className
          )}
        >
          <GraduationCap className="h-4 w-4" />
          Tutorial
        </Button>
      )}

      <TutorialWizardModal
        tutorial={tutorial}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
