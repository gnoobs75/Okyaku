/**
 * ConversationAnalyzer - Analyze meeting notes and call transcripts
 */

import { useState } from "react";
import {
  MessageSquare,
  FileText,
  RefreshCw,
  Sparkles,
  CheckSquare,
  MessageCircle,
  Users,
  Calendar,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/useApi";
import type {
  ConversationAnalysis,
  ConversationType,
  AnalyzeConversationRequest,
} from "@/types/conversation";
import {
  getSentimentBgColor,
  getConversationTypeLabel,
  formatDuration,
} from "@/types/conversation";

interface ConversationAnalyzerProps {
  contactId?: string;
  dealId?: string;
  onAnalysisComplete?: (analysis: ConversationAnalysis) => void;
}

export function ConversationAnalyzer({
  contactId,
  dealId,
  onAnalysisComplete,
}: ConversationAnalyzerProps) {
  const { post } = useApi();
  const [analysis, setAnalysis] = useState<ConversationAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ConversationType>("meeting");
  const [content, setContent] = useState("");
  const [participants, setParticipants] = useState("");
  const [duration, setDuration] = useState("");

  const handleAnalyze = async () => {
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    try {
      const request: AnalyzeConversationRequest = {
        type,
        title: title.trim(),
        notes: content.trim(),
        contact_id: contactId,
        deal_id: dealId,
        participants: participants
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p),
        duration_minutes: duration ? parseInt(duration) : undefined,
      };

      const result = await post("/ai/conversation/analyze", request);
      if (result) {
        setAnalysis(result as ConversationAnalysis);
        setShowForm(false);
        onAnalysisComplete?.(result as ConversationAnalysis);
      }
    } catch (error) {
      console.error("Failed to analyze conversation:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewAnalysis = () => {
    setAnalysis(null);
    setShowForm(true);
    setTitle("");
    setContent("");
    setParticipants("");
    setDuration("");
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <ThumbsUp className="h-4 w-4" />;
      case "negative":
        return <ThumbsDown className="h-4 w-4" />;
      case "mixed":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  // Render analysis results
  const renderAnalysis = () => {
    if (!analysis) return null;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">{analysis.title}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{getConversationTypeLabel(analysis.type)}</Badge>
              {analysis.duration_minutes && (
                <span>{formatDuration(analysis.duration_minutes)}</span>
              )}
              {analysis.participants.length > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {analysis.participants.length}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getSentimentBgColor(analysis.sentiment)}>
              {getSentimentIcon(analysis.sentiment)}
              <span className="ml-1">{analysis.sentiment}</span>
            </Badge>
          </div>
        </div>

        {/* Summary */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-700 mb-1">Summary</h4>
          <p className="text-sm text-blue-800">{analysis.summary}</p>
        </div>

        {/* Key Points */}
        {analysis.key_points.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Key Points
            </h4>
            <ul className="space-y-1">
              {analysis.key_points.map((point, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Items */}
        {analysis.action_items.length > 0 && (
          <div className="p-3 bg-green-50 rounded-lg">
            <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Action Items
            </h4>
            <ul className="space-y-2">
              {analysis.action_items.map((item, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <CheckSquare className="h-4 w-4 mt-0.5 text-green-600" />
                  <div>
                    <span>{typeof item === "string" ? item : item.description}</span>
                    {typeof item !== "string" && item.assignee && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {item.assignee}
                      </Badge>
                    )}
                    {typeof item !== "string" && item.due_date && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        Due: {item.due_date}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Expandable Details */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="mr-2 h-4 w-4" />
              Hide Details
            </>
          ) : (
            <>
              <ChevronDown className="mr-2 h-4 w-4" />
              Show More Details
            </>
          )}
        </Button>

        {expanded && (
          <div className="space-y-4 pt-2 border-t">
            {/* Decisions Made */}
            {analysis.decisions_made.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Decisions Made</h4>
                <ul className="space-y-1">
                  {analysis.decisions_made.map((decision, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      {decision}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Questions Raised */}
            {analysis.questions_raised.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Questions to Follow Up</h4>
                <ul className="space-y-1">
                  {analysis.questions_raised.map((question, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-orange-500">?</span>
                      {question}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Topics & Keywords */}
            {(analysis.topics.length > 0 || analysis.keywords.length > 0) && (
              <div>
                <h4 className="text-sm font-medium mb-2">Topics & Keywords</h4>
                <div className="flex flex-wrap gap-1">
                  {analysis.topics.map((topic, i) => (
                    <Badge key={`t-${i}`} variant="secondary">
                      {topic}
                    </Badge>
                  ))}
                  {analysis.keywords.map((keyword, i) => (
                    <Badge key={`k-${i}`} variant="outline">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Mentioned Entities */}
            {(analysis.mentioned_people.length > 0 ||
              analysis.mentioned_companies.length > 0) && (
              <div>
                <h4 className="text-sm font-medium mb-2">Mentioned</h4>
                <div className="flex flex-wrap gap-2 text-sm">
                  {analysis.mentioned_people.map((person, i) => (
                    <span key={`p-${i}`} className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {person}
                    </span>
                  ))}
                  {analysis.mentioned_companies.map((company, i) => (
                    <span key={`c-${i}`} className="text-muted-foreground">
                      {company}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="text-xs text-muted-foreground pt-2 border-t">
              Analyzed {new Date(analysis.analyzed_at).toLocaleString()} using{" "}
              {analysis.model_version}
            </div>
          </div>
        )}

        {/* New Analysis Button */}
        <Button variant="outline" onClick={handleNewAnalysis} className="w-full">
          <Sparkles className="mr-2 h-4 w-4" />
          Analyze Another Conversation
        </Button>
      </div>
    );
  };

  // Render input form
  const renderForm = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Paste meeting notes or call transcript to extract key insights,
        action items, and sentiment analysis.
      </p>

      {/* Title */}
      <div>
        <label className="text-sm font-medium">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Q1 Planning Meeting with Acme Corp"
          className="w-full mt-1 p-2 border rounded-lg text-sm"
        />
      </div>

      {/* Type */}
      <div>
        <label className="text-sm font-medium">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ConversationType)}
          className="w-full mt-1 p-2 border rounded-lg text-sm"
        >
          <option value="meeting">Meeting</option>
          <option value="call">Call</option>
          <option value="email_thread">Email Thread</option>
          <option value="chat">Chat</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Participants & Duration */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Participants</label>
          <input
            type="text"
            value={participants}
            onChange={(e) => setParticipants(e.target.value)}
            placeholder="John, Jane, Bob"
            className="w-full mt-1 p-2 border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Duration (minutes)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="30"
            className="w-full mt-1 p-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Content */}
      <div>
        <label className="text-sm font-medium">Notes / Transcript</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste your meeting notes or call transcript here..."
          className="w-full mt-1 p-3 border rounded-lg text-sm min-h-[150px] resize-none"
        />
      </div>

      {/* Submit */}
      <Button
        onClick={handleAnalyze}
        disabled={!title.trim() || !content.trim() || loading}
        className="w-full"
      >
        {loading ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Analyze Conversation
          </>
        )}
      </Button>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-purple-500" />
          Conversation Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent>{showForm ? renderForm() : renderAnalysis()}</CardContent>
    </Card>
  );
}
