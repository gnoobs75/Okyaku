/**
 * ChatInterface - Natural language CRM query interface
 */

import { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  Send,
  RefreshCw,
  Sparkles,
  User,
  Bot,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/useApi";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  intent?: {
    type: string;
    entity: string;
  };
  result?: Record<string, unknown>;
}

interface ChatInterfaceProps {
  onDataClick?: (type: string, id: string) => void;
}

export function ChatInterface({ onDataClick }: ChatInterfaceProps) {
  const { get, post } = useApi();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showExamples, setShowExamples] = useState(true);
  const [examples, setExamples] = useState<{
    examples: { category: string; queries: string[] }[];
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load examples on mount
  useEffect(() => {
    loadExamples();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadExamples = async () => {
    try {
      const result = await get("/ai/chat/examples");
      if (result) {
        setExamples(result as { examples: { category: string; queries: string[] }[] });
      }
    } catch (error) {
      console.error("Failed to load examples:", error);
    }
  };

  const handleSubmit = async (query?: string) => {
    const q = query || input.trim();
    if (!q || loading) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: q,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setShowExamples(false);
    setLoading(true);

    try {
      const result = await post("/ai/chat/query", { query: q });
      if (result) {
        const response = result as {
          response: string;
          intent: { type: string; entity: string };
          result: Record<string, unknown>;
        };

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.response,
          timestamp: new Date(),
          intent: response.intent,
          result: response.result,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Chat query failed:", error);
      const errorMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Sorry, I couldn't process that query. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleExampleClick = (query: string) => {
    handleSubmit(query);
  };

  const handleClear = () => {
    setMessages([]);
    setShowExamples(true);
    inputRef.current?.focus();
  };

  // Render a single message
  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === "user";

    return (
      <div
        key={message.id}
        className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
      >
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isUser ? "bg-blue-100" : "bg-purple-100"
          }`}
        >
          {isUser ? (
            <User className="h-4 w-4 text-blue-600" />
          ) : (
            <Bot className="h-4 w-4 text-purple-600" />
          )}
        </div>
        <div
          className={`flex-1 max-w-[80%] ${
            isUser ? "text-right" : "text-left"
          }`}
        >
          <div
            className={`inline-block p-3 rounded-lg ${
              isUser
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
          {!isUser && message.intent && (
            <div className="mt-1 flex gap-1">
              <Badge variant="outline" className="text-xs">
                {message.intent.type}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {message.intent.entity}
              </Badge>
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-1">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  // Render examples
  const renderExamples = () => {
    if (!examples || !showExamples) return null;

    return (
      <div className="space-y-4">
        <div className="text-center">
          <Sparkles className="h-8 w-8 mx-auto mb-2 text-purple-500" />
          <h3 className="font-medium">Ask me about your CRM data</h3>
          <p className="text-sm text-muted-foreground">
            Try clicking one of these example queries
          </p>
        </div>

        <div className="space-y-3">
          {examples.examples.slice(0, 3).map((category) => (
            <div key={category.category}>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                {category.category}
              </div>
              <div className="flex flex-wrap gap-2">
                {category.queries.slice(0, 2).map((query) => (
                  <button
                    key={query}
                    onClick={() => handleExampleClick(query)}
                    className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="flex flex-col h-[500px]">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-purple-500" />
            AI Chat
            <Badge variant="secondary">Natural Language</Badge>
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExamples(!showExamples)}
              title="Show examples"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                title="Clear chat"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            renderExamples()
          ) : (
            <>
              {messages.map(renderMessage)}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <RefreshCw className="h-4 w-4 animate-spin text-gray-500" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t flex-shrink-0">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your CRM data..."
              className="flex-1 p-2 border rounded-lg text-sm"
              disabled={loading}
            />
            <Button
              onClick={() => handleSubmit()}
              disabled={!input.trim() || loading}
              size="sm"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
