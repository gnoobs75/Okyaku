import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  X,
  BookOpen,
  ListChecks,
  Lightbulb,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useTutorial } from "@/context/TutorialContext";
import type { StageTutorial, TutorialSection, TerminologyItem } from "@/content/tutorials";

interface TutorialPanelProps {
  tutorial: StageTutorial;
  stageId: string;
}

function SectionAccordion({ section }: { section: TutorialSection }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium">{section.title}</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {section.steps.length} steps
        </Badge>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          <p className="text-sm text-muted-foreground">{section.content}</p>

          <div className="space-y-3">
            {section.steps.map((step, index) => (
              <div
                key={index}
                className="flex gap-3 p-3 bg-muted/30 rounded-lg"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{step.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                  {step.tip && (
                    <p className="text-sm text-blue-600 mt-1 flex items-start gap-1">
                      <Lightbulb className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      {step.tip}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {section.warnings && section.warnings.length > 0 && (
            <div className="space-y-2 mt-4">
              {section.warnings.map((warning, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm"
                >
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <span className="text-yellow-800">{warning}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TerminologyList({ terms }: { terms: TerminologyItem[] }) {
  const sortedTerms = [...terms].sort((a, b) => a.term.localeCompare(b.term));

  return (
    <div className="space-y-3">
      {sortedTerms.map((item, index) => (
        <div key={index} className="p-3 border rounded-lg">
          <div className="font-medium text-sm">{item.term}</div>
          <div className="text-sm text-muted-foreground mt-1">
            {item.definition}
          </div>
          {item.example && (
            <div className="text-sm text-blue-600 mt-1 italic">
              Example: {item.example}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function TutorialPanel({ tutorial, stageId }: TutorialPanelProps) {
  const { dismissTutorial, isTutorialDismissed } = useTutorial();
  const [activeTab, setActiveTab] = useState("guide");

  // Don't render if dismissed
  if (isTutorialDismissed(stageId)) {
    return null;
  }

  // Collect all terminology from all sections
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

  // Collect all tips from all sections
  const allTips: string[] = [];
  tutorial.sections.forEach((section) => {
    section.tips?.forEach((tip) => allTips.push(tip));
  });

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg text-blue-900">
              {tutorial.title}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => dismissTutorial(stageId)}
            title="Hide this tutorial"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {tutorial.introduction}
        </p>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Quick Start */}
        <div className="mb-4 p-4 bg-white rounded-lg border">
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className="h-4 w-4 text-green-600" />
            <span className="font-medium text-sm">Quick Start</span>
          </div>
          <ol className="space-y-2">
            {tutorial.quickStart.map((step, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </span>
                <span className="text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="guide" className="text-xs">
              Step-by-Step
            </TabsTrigger>
            <TabsTrigger value="glossary" className="text-xs">
              Glossary
              {allTerminology.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {allTerminology.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tips" className="text-xs">
              Tips & Issues
            </TabsTrigger>
          </TabsList>

          <TabsContent value="guide" className="mt-4 space-y-3">
            {tutorial.sections.map((section, index) => (
              <SectionAccordion key={index} section={section} />
            ))}
          </TabsContent>

          <TabsContent value="glossary" className="mt-4">
            {allTerminology.length > 0 ? (
              <TerminologyList terms={allTerminology} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No terminology defined for this screen.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tips" className="mt-4 space-y-4">
            {/* Tips */}
            {allTips.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-sm">Pro Tips</span>
                </div>
                <div className="space-y-2">
                  {allTips.map((tip, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-100 rounded text-sm"
                    >
                      <span className="text-blue-600">-</span>
                      <span className="text-blue-800">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Common Issues */}
            {tutorial.commonIssues.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <HelpCircle className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-sm">Troubleshooting</span>
                </div>
                <div className="space-y-3">
                  {tutorial.commonIssues.map((issue, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-lg bg-white"
                    >
                      <div className="font-medium text-sm text-red-700">
                        Problem: {issue.problem}
                      </div>
                      <div className="text-sm text-green-700 mt-1">
                        Solution: {issue.solution}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {allTips.length === 0 && tutorial.commonIssues.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tips or issues documented yet.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
