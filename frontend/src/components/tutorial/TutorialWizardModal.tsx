import { useState, useEffect } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Target,
  BookOpen,
  Lightbulb,
  HelpCircle,
  CheckCircle2,
  Rocket,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StageTutorial, TutorialSection, TerminologyItem } from "@/content/tutorials";

interface TutorialWizardModalProps {
  tutorial: StageTutorial;
  isOpen: boolean;
  onClose: () => void;
}

type SlideType = "welcome" | "why" | "section" | "glossary" | "complete";

interface Slide {
  type: SlideType;
  title: string;
  sectionIndex?: number;
}

export function TutorialWizardModal({ tutorial, isOpen, onClose }: TutorialWizardModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Build slides array
  const slides: Slide[] = [
    { type: "welcome", title: "Welcome" },
    { type: "why", title: "Why This Matters" },
    ...tutorial.sections.map((_, index) => ({
      type: "section" as SlideType,
      title: tutorial.sections[index].title,
      sectionIndex: index,
    })),
    { type: "glossary", title: "Glossary" },
    { type: "complete", title: "You're Ready!" },
  ];

  // Collect all terminology
  const allTerminology: TerminologyItem[] = [];
  const seenTerms = new Set<string>();
  tutorial.sections.forEach((section) => {
    section.terminology?.forEach((term) => {
      if (!seenTerms.has(term.term.toLowerCase())) {
        seenTerms.add(term.term.toLowerCase());
        allTerminology.push(term);
      }
    });
  });

  // Reset slide when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
    }
  }, [isOpen]);

  const goToSlide = (index: number) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentSlide(index);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      goToSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      goToSlide(currentSlide - 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") nextSlide();
    if (e.key === "ArrowLeft") prevSlide();
    if (e.key === "Escape") onClose();
  };

  if (!isOpen) return null;

  const currentSlideData = slides[currentSlide];
  const progress = ((currentSlide + 1) / slides.length) * 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-[#C52638] to-[#E85A6B] transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#C52638]/10">
              <GraduationCap className="h-5 w-5 text-[#C52638]" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{tutorial.title}</h2>
              <p className="text-sm text-gray-500">
                Step {currentSlide + 1} of {slides.length}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[400px] max-h-[60vh] overflow-y-auto">
          <div
            className={cn(
              "transition-all duration-300",
              isAnimating ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"
            )}
          >
            {currentSlideData.type === "welcome" && (
              <WelcomeSlide tutorial={tutorial} />
            )}
            {currentSlideData.type === "why" && (
              <WhySlide tutorial={tutorial} />
            )}
            {currentSlideData.type === "section" && currentSlideData.sectionIndex !== undefined && (
              <SectionSlide section={tutorial.sections[currentSlideData.sectionIndex]} />
            )}
            {currentSlideData.type === "glossary" && (
              <GlossarySlide terms={allTerminology} />
            )}
            {currentSlideData.type === "complete" && (
              <CompleteSlide tutorial={tutorial} onClose={onClose} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  index === currentSlide
                    ? "w-6 bg-[#C52638]"
                    : index < currentSlide
                    ? "bg-[#C52638]/50"
                    : "bg-gray-300 hover:bg-gray-400"
                )}
                title={slides[index].title}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            {currentSlide < slides.length - 1 ? (
              <Button
                onClick={nextSlide}
                className="gap-1 bg-[#C52638] hover:bg-[#A51F2E]"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={onClose}
                className="gap-1 bg-[#C52638] hover:bg-[#A51F2E]"
              >
                Get Started
                <Rocket className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SLIDE COMPONENTS
// ============================================================================

function WelcomeSlide({ tutorial }: { tutorial: StageTutorial }) {
  return (
    <div className="text-center py-4">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#C52638] to-[#E85A6B] mb-6">
        <Sparkles className="h-10 w-10 text-white" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-3">
        Welcome to {tutorial.stageName}
      </h3>
      <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
        {tutorial.introduction}
      </p>

      {/* Quick Start Preview */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 text-left">
        <div className="flex items-center gap-2 mb-4">
          <Rocket className="h-5 w-5 text-blue-600" />
          <span className="font-semibold text-blue-900">Quick Start Guide</span>
        </div>
        <div className="space-y-2">
          {tutorial.quickStart.slice(0, 4).map((step, index) => (
            <div key={index} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium">
                {index + 1}
              </span>
              <span className="text-gray-700 text-sm">{step}</span>
            </div>
          ))}
          {tutorial.quickStart.length > 4 && (
            <p className="text-sm text-blue-600 ml-9">
              +{tutorial.quickStart.length - 4} more steps...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function WhySlide({ tutorial }: { tutorial: StageTutorial }) {
  // Generate "why" content based on the tutorial
  const whyPoints = getWhyContent(tutorial.id);

  return (
    <div className="py-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-amber-100">
          <Target className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Why This Matters</h3>
          <p className="text-gray-500">Understanding the value of {tutorial.stageName}</p>
        </div>
      </div>

      <div className="space-y-4">
        {whyPoints.map((point, index) => (
          <div
            key={index}
            className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-white border border-gray-100"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#C52638]/10 flex items-center justify-center">
              <point.icon className="h-4 w-4 text-[#C52638]" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">{point.title}</h4>
              <p className="text-gray-600 text-sm">{point.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionSlide({ section }: { section: TutorialSection }) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  return (
    <div className="py-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-xl bg-green-100">
          <BookOpen className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">{section.title}</h3>
          <p className="text-gray-500">How to do it</p>
        </div>
      </div>

      <p className="text-gray-600 mb-6">{section.content}</p>

      {/* Steps */}
      <div className="space-y-3">
        {section.steps.map((step, index) => (
          <div
            key={index}
            className={cn(
              "rounded-xl border transition-all duration-200 cursor-pointer",
              expandedStep === index
                ? "bg-[#C52638]/5 border-[#C52638]/20"
                : "bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50"
            )}
            onClick={() => setExpandedStep(expandedStep === index ? null : index)}
          >
            <div className="flex items-center gap-4 p-4">
              <div className={cn(
                "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors",
                expandedStep === index
                  ? "bg-[#C52638] text-white"
                  : "bg-gray-100 text-gray-600"
              )}>
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900">{step.title}</h4>
                {expandedStep !== index && (
                  <p className="text-sm text-gray-500 truncate">{step.description}</p>
                )}
              </div>
              <ChevronRight
                className={cn(
                  "h-5 w-5 text-gray-400 transition-transform",
                  expandedStep === index && "rotate-90"
                )}
              />
            </div>
            {expandedStep === index && (
              <div className="px-4 pb-4 ml-14">
                <p className="text-gray-600 mb-2">{step.description}</p>
                {step.tip && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100">
                    <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-amber-800">{step.tip}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tips */}
      {section.tips && section.tips.length > 0 && (
        <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-900">Pro Tips</span>
          </div>
          <ul className="space-y-1">
            {section.tips.map((tip, index) => (
              <li key={index} className="text-sm text-blue-800 flex items-start gap-2">
                <span className="text-blue-400">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function GlossarySlide({ terms }: { terms: TerminologyItem[] }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTerms = terms
    .filter(
      (term) =>
        term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.definition.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.term.localeCompare(b.term));

  return (
    <div className="py-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-xl bg-purple-100">
          <HelpCircle className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Glossary</h3>
          <p className="text-gray-500">Key terms to know</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search terms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#C52638]/20 focus:border-[#C52638]"
        />
      </div>

      {filteredTerms.length > 0 ? (
        <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
          {filteredTerms.map((term, index) => (
            <div
              key={index}
              className="p-4 rounded-xl bg-gradient-to-r from-gray-50 to-white border border-gray-100"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-gray-900">{term.term}</h4>
                <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                  Term
                </Badge>
              </div>
              <p className="text-gray-600 text-sm mt-1">{term.definition}</p>
              {term.example && (
                <p className="text-purple-600 text-sm mt-2 italic">
                  Example: {term.example}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No matching terms found</p>
        </div>
      )}
    </div>
  );
}

function CompleteSlide({ tutorial, onClose }: { tutorial: StageTutorial; onClose: () => void }) {
  return (
    <div className="text-center py-8">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 mb-6">
        <CheckCircle2 className="h-10 w-10 text-white" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-3">
        You're All Set!
      </h3>
      <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
        You now know the essentials of {tutorial.stageName}. Start exploring and don't hesitate to come back to this tutorial anytime.
      </p>

      {/* Common Issues Preview */}
      {tutorial.commonIssues.length > 0 && (
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 text-left mb-6">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="h-5 w-5 text-orange-600" />
            <span className="font-semibold text-orange-900">Need Help?</span>
          </div>
          <div className="space-y-3">
            {tutorial.commonIssues.slice(0, 2).map((issue, index) => (
              <div key={index} className="text-sm">
                <p className="text-orange-800 font-medium">Q: {issue.problem}</p>
                <p className="text-orange-700">A: {issue.solution}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button
        onClick={onClose}
        size="lg"
        className="bg-[#C52638] hover:bg-[#A51F2E] gap-2"
      >
        Start Using {tutorial.stageName}
        <Rocket className="h-5 w-5" />
      </Button>
    </div>
  );
}

// ============================================================================
// WHY CONTENT GENERATOR
// ============================================================================

interface WhyPoint {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

function getWhyContent(tutorialId: string): WhyPoint[] {
  const whyContentMap: Record<string, WhyPoint[]> = {
    dashboard: [
      {
        icon: Target,
        title: "Instant Visibility",
        description: "See your entire sales operation at a glance without digging through multiple screens or reports.",
      },
      {
        icon: Lightbulb,
        title: "Data-Driven Decisions",
        description: "Make informed decisions based on real-time metrics and trends rather than gut feelings.",
      },
      {
        icon: Rocket,
        title: "Stay Proactive",
        description: "Catch issues early with alerts on overdue tasks, stalled deals, and declining metrics.",
      },
    ],
    contacts: [
      {
        icon: Target,
        title: "Centralized Relationships",
        description: "Keep all your business relationships organized in one place with complete interaction history.",
      },
      {
        icon: Lightbulb,
        title: "Never Lose Context",
        description: "Access complete contact history before any call or meeting to pick up right where you left off.",
      },
      {
        icon: Rocket,
        title: "Segment & Target",
        description: "Filter and segment contacts for targeted campaigns and personalized outreach.",
      },
    ],
    companies: [
      {
        icon: Target,
        title: "Account-Based View",
        description: "Understand the full picture of each business relationship across all contacts and deals.",
      },
      {
        icon: Lightbulb,
        title: "Identify Key Accounts",
        description: "Track which companies drive the most value and deserve the most attention.",
      },
      {
        icon: Rocket,
        title: "Multi-Threading",
        description: "See all stakeholders at a company to build deeper, more resilient relationships.",
      },
    ],
    deals: [
      {
        icon: Target,
        title: "Visual Pipeline",
        description: "See exactly where every opportunity stands and what needs attention to close.",
      },
      {
        icon: Lightbulb,
        title: "Accurate Forecasting",
        description: "Predict revenue with confidence using stage-based probabilities and close dates.",
      },
      {
        icon: Rocket,
        title: "Accelerate Deals",
        description: "Identify stuck deals quickly and take action to move them forward.",
      },
    ],
    activities: [
      {
        icon: Target,
        title: "Complete History",
        description: "Never forget a conversation - every call, email, and meeting is documented.",
      },
      {
        icon: Lightbulb,
        title: "Team Visibility",
        description: "Know what your team has been doing and ensure consistent customer experiences.",
      },
      {
        icon: Rocket,
        title: "Measure Effort",
        description: "Track activity volume to understand what drives results and optimize your process.",
      },
    ],
    tasks: [
      {
        icon: Target,
        title: "Never Drop the Ball",
        description: "Track every follow-up and action item so nothing falls through the cracks.",
      },
      {
        icon: Lightbulb,
        title: "Prioritize What Matters",
        description: "Focus on high-impact tasks with priority levels and due dates.",
      },
      {
        icon: Rocket,
        title: "Drive Accountability",
        description: "Clear ownership and deadlines keep your team moving forward consistently.",
      },
    ],
    "email-campaigns": [
      {
        icon: Target,
        title: "Scale Your Outreach",
        description: "Reach hundreds of contacts with personalized messages in minutes, not hours.",
      },
      {
        icon: Lightbulb,
        title: "Measure What Works",
        description: "Track opens, clicks, and conversions to continuously improve your messaging.",
      },
      {
        icon: Rocket,
        title: "Nurture Leads Automatically",
        description: "Stay top-of-mind with prospects through scheduled, targeted campaigns.",
      },
    ],
    "social-calendar": [
      {
        icon: Target,
        title: "Consistent Presence",
        description: "Maintain a regular posting schedule that keeps your audience engaged.",
      },
      {
        icon: Lightbulb,
        title: "Plan Ahead",
        description: "Batch your content creation and schedule posts for optimal times.",
      },
      {
        icon: Rocket,
        title: "Multi-Platform Efficiency",
        description: "Manage all your social channels from one centralized calendar view.",
      },
    ],
    "social-analytics": [
      {
        icon: Target,
        title: "Understand Your Audience",
        description: "Learn what content resonates and when your audience is most active.",
      },
      {
        icon: Lightbulb,
        title: "Prove ROI",
        description: "Demonstrate the value of social media with concrete metrics and trends.",
      },
      {
        icon: Rocket,
        title: "Optimize Strategy",
        description: "Use data to refine your content strategy and maximize engagement.",
      },
    ],
    "ai-content": [
      {
        icon: Target,
        title: "Overcome Writer's Block",
        description: "Generate fresh content ideas instantly when inspiration runs dry.",
      },
      {
        icon: Lightbulb,
        title: "Save Hours Weekly",
        description: "Create quality content in seconds instead of staring at a blank screen.",
      },
      {
        icon: Rocket,
        title: "Platform-Optimized",
        description: "Get content automatically tailored for each social platform's best practices.",
      },
    ],
  };

  // Return specific content or default
  return (
    whyContentMap[tutorialId] || [
      {
        icon: Target,
        title: "Stay Organized",
        description: "Keep all your information structured and easily accessible.",
      },
      {
        icon: Lightbulb,
        title: "Work Smarter",
        description: "Streamline your workflow and reduce manual effort.",
      },
      {
        icon: Rocket,
        title: "Achieve More",
        description: "Focus on what matters and accomplish your goals faster.",
      },
    ]
  );
}
