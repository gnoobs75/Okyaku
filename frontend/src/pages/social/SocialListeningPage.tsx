import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Ear,
  Plus,
  Search,
  Bell,
  BellOff,
  Flag,
  FlagOff,
  Eye,
  ExternalLink,
  Trash2,
  Calendar,
  BarChart2,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Minus,
  X,
  Filter,
  Linkedin,
  Twitter,
  Facebook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TutorialPanel } from "@/components/tutorial";
import { useApi } from "@/hooks/useApi";
import { useTutorial } from "@/context/TutorialContext";
import { getTutorialForStage } from "@/content/tutorials";
import type {
  TrackedKeyword,
  BrandMention,
  MentionAlert,
  ListeningStats,
  MentionTimelinePoint,
  PaginatedMentions,
  MentionSentiment,
  MentionSource,
  AlertPriority,
} from "@/types/socialListening";

const sentimentColors: Record<MentionSentiment, string> = {
  positive: "text-green-600 bg-green-50 border-green-200",
  neutral: "text-gray-600 bg-gray-50 border-gray-200",
  negative: "text-red-600 bg-red-50 border-red-200",
  unknown: "text-gray-400 bg-gray-50 border-gray-200",
};

const sentimentIcons: Record<MentionSentiment, React.ComponentType<{ className?: string }>> = {
  positive: ThumbsUp,
  neutral: Minus,
  negative: ThumbsDown,
  unknown: Minus,
};

const sourceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  twitter: Twitter,
  linkedin: Linkedin,
  facebook: Facebook,
};

const priorityColors: Record<AlertPriority, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export function SocialListeningPage() {
  const { tutorialMode } = useTutorial();
  const tutorial = getTutorialForStage("social-listening");
  const { get, post, patch, del } = useApi();
  const [loading, setLoading] = useState(true);
  const [keywords, setKeywords] = useState<TrackedKeyword[]>([]);
  const [mentions, setMentions] = useState<BrandMention[]>([]);
  const [alerts, setAlerts] = useState<MentionAlert[]>([]);
  const [stats, setStats] = useState<ListeningStats | null>(null);
  const [timeline, setTimeline] = useState<MentionTimelinePoint[]>([]);
  const [totalMentions, setTotalMentions] = useState(0);
  const [page, setPage] = useState(1);

  // Filters
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterSentiment, setFilterSentiment] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [search, setSearch] = useState("");

  // Sheet states
  const [showAddKeyword, setShowAddKeyword] = useState(false);
  const [selectedMention, setSelectedMention] = useState<BrandMention | null>(null);

  // New keyword form
  const [newKeyword, setNewKeyword] = useState({
    keyword: "",
    alert_on_mention: false,
    alert_priority: "medium" as AlertPriority,
    notes: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("page_size", "20");
      if (filterKeyword) params.set("keyword_id", filterKeyword);
      if (filterSource) params.set("source", filterSource);
      if (filterSentiment) params.set("sentiment", filterSentiment);
      if (unreadOnly) params.set("unread_only", "true");
      if (flaggedOnly) params.set("flagged_only", "true");
      if (search) params.set("search", search);

      const [keywordsData, mentionsData, alertsData, statsData, timelineData] = await Promise.all([
        get("/social/listening/keywords"),
        get(`/social/listening/mentions?${params.toString()}`),
        get("/social/listening/alerts"),
        get("/social/listening/stats"),
        get("/social/listening/timeline"),
      ]);

      if (keywordsData) setKeywords(keywordsData as TrackedKeyword[]);
      if (mentionsData) {
        const paginated = mentionsData as PaginatedMentions;
        setMentions(paginated.items);
        setTotalMentions(paginated.total);
      }
      if (alertsData) setAlerts(alertsData as MentionAlert[]);
      if (statsData) setStats(statsData as ListeningStats);
      if (timelineData) setTimeline(timelineData as MentionTimelinePoint[]);
    } catch (error) {
      console.error("Failed to fetch listening data:", error);
    } finally {
      setLoading(false);
    }
  }, [get, page, filterKeyword, filterSource, filterSentiment, unreadOnly, flaggedOnly, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddKeyword = async () => {
    try {
      await post("/social/listening/keywords", newKeyword);
      setShowAddKeyword(false);
      setNewKeyword({ keyword: "", alert_on_mention: false, alert_priority: "medium", notes: "" });
      fetchData();
    } catch (error) {
      console.error("Failed to add keyword:", error);
    }
  };

  const handleDeleteKeyword = async (keywordId: string) => {
    if (!confirm("Delete this keyword and all its mentions?")) return;
    try {
      await del(`/social/listening/keywords/${keywordId}`);
      fetchData();
    } catch (error) {
      console.error("Failed to delete keyword:", error);
    }
  };

  const handleMarkRead = async (mentionId: string) => {
    try {
      await post(`/social/listening/mentions/${mentionId}/read`, {});
      fetchData();
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleToggleFlag = async (mentionId: string) => {
    try {
      await post(`/social/listening/mentions/${mentionId}/flag`, {});
      fetchData();
    } catch (error) {
      console.error("Failed to toggle flag:", error);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await post(`/social/listening/alerts/${alertId}/acknowledge`, {});
      fetchData();
    } catch (error) {
      console.error("Failed to acknowledge alert:", error);
    }
  };

  const clearFilters = () => {
    setFilterKeyword("");
    setFilterSource("");
    setFilterSentiment("");
    setUnreadOnly(false);
    setFlaggedOnly(false);
    setSearch("");
  };

  const hasFilters = filterKeyword || filterSource || filterSentiment || unreadOnly || flaggedOnly || search;

  return (
    <div className="space-y-6">
      {tutorialMode && tutorial && (
        <TutorialPanel tutorial={tutorial} stageId="social-listening" />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Social Listening</h1>
          <p className="text-muted-foreground">
            Monitor brand mentions and track keywords across social media
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
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Tracked Keywords</p>
              <p className="text-2xl font-bold mt-2">{stats.total_keywords}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Total Mentions</p>
              <p className="text-2xl font-bold mt-2">{stats.total_mentions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Unread</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">{stats.unread_mentions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Flagged</p>
              <p className="text-2xl font-bold text-orange-600 mt-2">{stats.flagged_mentions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Avg Sentiment</p>
              <p className={`text-2xl font-bold mt-2 ${
                stats.avg_sentiment_score && stats.avg_sentiment_score > 0 ? "text-green-600" :
                stats.avg_sentiment_score && stats.avg_sentiment_score < 0 ? "text-red-600" : ""
              }`}>
                {stats.avg_sentiment_score?.toFixed(2) || "N/A"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="mentions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="mentions" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Mentions
          </TabsTrigger>
          <TabsTrigger value="keywords" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Keywords
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alerts
            {alerts.length > 0 && (
              <Badge variant="destructive" className="ml-1">{alerts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            Trends
          </TabsTrigger>
        </TabsList>

        {/* Mentions Tab */}
        <TabsContent value="mentions" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search mentions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              className="w-40"
            >
              <option value="">All Keywords</option>
              {keywords.map((k) => (
                <option key={k.id} value={k.id}>{k.keyword}</option>
              ))}
            </Select>

            <Select
              value={filterSentiment}
              onChange={(e) => setFilterSentiment(e.target.value)}
              className="w-36"
            >
              <option value="">All Sentiments</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </Select>

            <Button
              variant={unreadOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setUnreadOnly(!unreadOnly)}
            >
              <Eye className="mr-1 h-4 w-4" />
              Unread
            </Button>

            <Button
              variant={flaggedOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setFlaggedOnly(!flaggedOnly)}
            >
              <Flag className="mr-1 h-4 w-4" />
              Flagged
            </Button>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          {/* Mentions List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
          ) : mentions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Ear className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No mentions found</h3>
                <p className="text-muted-foreground">
                  {hasFilters ? "Try adjusting your filters" : "Start tracking keywords to see mentions"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {mentions.map((mention) => {
                const SentimentIcon = sentimentIcons[mention.sentiment];
                const SourceIcon = sourceIcons[mention.source] || MessageSquare;
                return (
                  <Card key={mention.id} className={!mention.is_read ? "border-l-4 border-l-blue-500" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="shrink-0">
                          {mention.author_profile_image ? (
                            <img
                              src={mention.author_profile_image}
                              alt=""
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                              <SourceIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                              {mention.author_display_name || mention.author_username || "Unknown"}
                            </span>
                            {mention.author_username && (
                              <span className="text-sm text-muted-foreground">
                                @{mention.author_username}
                              </span>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {mention.keyword}
                            </Badge>
                          </div>
                          <p className="text-sm mb-2 whitespace-pre-wrap">
                            {mention.content_preview || mention.content.slice(0, 280)}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <SourceIcon className="h-3 w-3" />
                              {mention.source}
                            </span>
                            <span>{format(new Date(mention.mentioned_at), "MMM d, yyyy h:mm a")}</span>
                            {mention.likes > 0 && <span>{mention.likes} likes</span>}
                            {mention.author_followers && (
                              <span>{mention.author_followers.toLocaleString()} followers</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <Badge className={sentimentColors[mention.sentiment]}>
                            <SentimentIcon className="h-3 w-3 mr-1" />
                            {mention.sentiment}
                          </Badge>
                          <div className="flex gap-1">
                            {!mention.is_read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkRead(mention.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleFlag(mention.id)}
                            >
                              {mention.is_flagged ? (
                                <FlagOff className="h-4 w-4 text-orange-500" />
                              ) : (
                                <Flag className="h-4 w-4" />
                              )}
                            </Button>
                            {mention.source_url && (
                              <a
                                href={mention.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button variant="ghost" size="sm">
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalMentions > 20 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Page {page} of {Math.ceil(totalMentions / 20)}
              </span>
              <Button
                variant="outline"
                disabled={page >= Math.ceil(totalMentions / 20)}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Keywords Tab */}
        <TabsContent value="keywords" className="space-y-6">
          <div className="flex justify-between">
            <Button onClick={() => setShowAddKeyword(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Keyword
            </Button>
          </div>

          {keywords.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No keywords tracked</h3>
                <p className="text-muted-foreground mb-4">
                  Add keywords to start monitoring brand mentions
                </p>
                <Button onClick={() => setShowAddKeyword(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Keyword
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {keywords.map((keyword) => (
                <Card key={keyword.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{keyword.keyword}</h3>
                        {keyword.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{keyword.notes}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteKeyword(keyword.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                      <Badge variant="secondary">{keyword.mention_count} mentions</Badge>
                      {keyword.alert_on_mention && (
                        <Badge className={priorityColors[keyword.alert_priority]}>
                          <Bell className="h-3 w-3 mr-1" />
                          {keyword.alert_priority}
                        </Badge>
                      )}
                    </div>
                    {keyword.last_mention_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Last mention: {format(new Date(keyword.last_mention_at), "MMM d, yyyy")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BellOff className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No pending alerts</h3>
                <p className="text-muted-foreground">
                  All caught up! New alerts will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <Card key={alert.id} className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={priorityColors[alert.priority]}>
                            {alert.priority}
                          </Badge>
                          <h3 className="font-semibold">{alert.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(alert.created_at), "MMM d, yyyy h:mm a")}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                      >
                        Acknowledge
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mentions Over Time</CardTitle>
              <CardDescription>Last 30 days of brand mention activity</CardDescription>
            </CardHeader>
            <CardContent>
              {timeline.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#8884d8" name="Total" />
                    <Line type="monotone" dataKey="positive" stroke="#22c55e" name="Positive" />
                    <Line type="monotone" dataKey="negative" stroke="#ef4444" name="Negative" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sentiment Breakdown */}
          {stats && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Sentiment Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.sentiment_breakdown).map(([sentiment, count]) => (
                      <div key={sentiment} className="flex items-center gap-3">
                        <Badge className={sentimentColors[sentiment as MentionSentiment]}>
                          {sentiment}
                        </Badge>
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div
                            className={`h-full rounded-full ${
                              sentiment === "positive" ? "bg-green-500" :
                              sentiment === "negative" ? "bg-red-500" : "bg-gray-400"
                            }`}
                            style={{
                              width: `${(count / stats.total_mentions) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Keywords</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.top_keywords.map((keyword, index) => (
                      <div key={keyword.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            #{index + 1}
                          </span>
                          <span className="font-medium">{keyword.keyword}</span>
                        </div>
                        <Badge variant="secondary">{keyword.mention_count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Keyword Sheet */}
      <Sheet open={showAddKeyword} onOpenChange={setShowAddKeyword}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Add Tracked Keyword</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label>Keyword *</Label>
              <Input
                value={newKeyword.keyword}
                onChange={(e) => setNewKeyword({ ...newKeyword, keyword: e.target.value })}
                placeholder="e.g., your brand name, product, competitor"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={newKeyword.notes}
                onChange={(e) => setNewKeyword({ ...newKeyword, notes: e.target.value })}
                placeholder="Optional notes about this keyword"
              />
            </div>

            <div className="flex items-center gap-4">
              <Label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newKeyword.alert_on_mention}
                  onChange={(e) => setNewKeyword({ ...newKeyword, alert_on_mention: e.target.checked })}
                />
                Alert on new mentions
              </Label>
            </div>

            {newKeyword.alert_on_mention && (
              <div className="space-y-2">
                <Label>Alert Priority</Label>
                <Select
                  value={newKeyword.alert_priority}
                  onChange={(e) => setNewKeyword({ ...newKeyword, alert_priority: e.target.value as AlertPriority })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </Select>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleAddKeyword}
              disabled={!newKeyword.keyword.trim()}
            >
              Add Keyword
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
