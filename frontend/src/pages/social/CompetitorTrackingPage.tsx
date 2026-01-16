import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { TutorialPanel } from "@/components/tutorial";
import { useTutorial } from "@/context/TutorialContext";
import { getTutorialForStage } from "@/content/tutorials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Building2,
  Globe,
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
  BarChart3,
  Eye,
  Lightbulb,
  CheckCircle,
  Trash2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import {
  Competitor,
  CompetitorStats,
  CompetitorComparison,
  CompetitiveInsight,
  CompetitorCreate,
} from "@/types/competitorTracking";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const INSIGHT_TYPE_COLORS: Record<string, string> = {
  gap: "bg-yellow-100 text-yellow-700",
  opportunity: "bg-green-100 text-green-700",
  threat: "bg-red-100 text-red-700",
  trend: "bg-blue-100 text-blue-700",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-gray-500",
  medium: "text-yellow-500",
  high: "text-red-500",
};

export function CompetitorTrackingPage() {
  const { token } = useAuth();
  const { tutorialMode } = useTutorial();
  const tutorial = getTutorialForStage("competitor-tracking");
  const [activeTab, setActiveTab] = useState("competitors");
  const [loading, setLoading] = useState(true);

  // Data states
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [stats, setStats] = useState<CompetitorStats | null>(null);
  const [comparison, setComparison] = useState<CompetitorComparison | null>(null);
  const [insights, setInsights] = useState<CompetitiveInsight[]>([]);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState<CompetitorCreate>({
    name: "",
    description: "",
    website_url: "",
    industry: "",
    twitter_handle: "",
    linkedin_url: "",
    instagram_handle: "",
  });

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCompetitors(),
        loadStats(),
        loadComparison(),
        loadInsights(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadCompetitors = async () => {
    const res = await fetch(`${API_URL}/api/v1/competitors/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setCompetitors(await res.json());
    }
  };

  const loadStats = async () => {
    const res = await fetch(`${API_URL}/api/v1/competitors/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setStats(await res.json());
    }
  };

  const loadComparison = async () => {
    const res = await fetch(`${API_URL}/api/v1/competitors/comparison`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setComparison(await res.json());
    }
  };

  const loadInsights = async () => {
    const res = await fetch(`${API_URL}/api/v1/competitors/insights`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setInsights(await res.json());
    }
  };

  const createCompetitor = async () => {
    if (!newCompetitor.name.trim()) return;

    const res = await fetch(`${API_URL}/api/v1/competitors/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newCompetitor),
    });

    if (res.ok) {
      setNewCompetitor({
        name: "",
        description: "",
        website_url: "",
        industry: "",
        twitter_handle: "",
        linkedin_url: "",
        instagram_handle: "",
      });
      setShowAddForm(false);
      loadCompetitors();
      loadStats();
      loadComparison();
    }
  };

  const deleteCompetitor = async (id: string) => {
    const res = await fetch(`${API_URL}/api/v1/competitors/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      loadCompetitors();
      loadStats();
      loadComparison();
    }
  };

  const markInsightRead = async (id: string) => {
    const res = await fetch(`${API_URL}/api/v1/competitors/insights/${id}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      loadInsights();
      loadStats();
    }
  };

  const markInsightActioned = async (id: string) => {
    const res = await fetch(`${API_URL}/api/v1/competitors/insights/${id}/action`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      loadInsights();
    }
  };

  // Prepare radar chart data
  const radarData = comparison?.competitors.map((c, index) => {
    const followers = comparison.metrics.followers.find((m) => m.name === c.name);
    const engagement = comparison.metrics.engagement_rate.find((m) => m.name === c.name);
    const posting = comparison.metrics.posting_frequency.find((m) => m.name === c.name);
    const likes = comparison.metrics.avg_likes.find((m) => m.name === c.name);

    // Normalize to 0-100 scale
    const maxFollowers = Math.max(...comparison.metrics.followers.map((m) => m.value), 1);
    const maxEngagement = Math.max(...comparison.metrics.engagement_rate.map((m) => m.value), 1);
    const maxPosting = Math.max(...comparison.metrics.posting_frequency.map((m) => m.value), 1);
    const maxLikes = Math.max(...comparison.metrics.avg_likes.map((m) => m.value), 1);

    return {
      name: c.name,
      followers: Math.round(((followers?.value || 0) / maxFollowers) * 100),
      engagement: Math.round(((engagement?.value || 0) / maxEngagement) * 100),
      posting: Math.round(((posting?.value || 0) / maxPosting) * 100),
      likes: Math.round(((likes?.value || 0) / maxLikes) * 100),
    };
  }) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tutorialMode && tutorial && (
        <TutorialPanel tutorial={tutorial} stageId="competitor-tracking" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Competitor Tracking</h1>
          <p className="text-muted-foreground">
            Monitor and analyze your competition
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Competitor
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="h-4 w-4" />
              Competitors
            </div>
            <p className="text-2xl font-bold mt-2">{stats?.total_competitors || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <BarChart3 className="h-4 w-4" />
              Combined Followers
            </div>
            <p className="text-2xl font-bold mt-2">
              {(stats?.combined_followers || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4" />
              Avg Engagement
            </div>
            <p className="text-2xl font-bold mt-2">
              {stats?.avg_engagement_rate || 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Lightbulb className="h-4 w-4" />
              Pending Insights
            </div>
            <p className="text-2xl font-bold mt-2">{stats?.pending_insights || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Competitor Form */}
      {showAddForm && (
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Add New Competitor</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Company Name *
              </label>
              <Input
                placeholder="Competitor name"
                value={newCompetitor.name}
                onChange={(e) =>
                  setNewCompetitor({ ...newCompetitor, name: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Industry</label>
              <Input
                placeholder="e.g., SaaS, E-commerce"
                value={newCompetitor.industry || ""}
                onChange={(e) =>
                  setNewCompetitor({ ...newCompetitor, industry: e.target.value })
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Input
                placeholder="Brief description of this competitor"
                value={newCompetitor.description || ""}
                onChange={(e) =>
                  setNewCompetitor({ ...newCompetitor, description: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Website</label>
              <Input
                placeholder="https://example.com"
                value={newCompetitor.website_url || ""}
                onChange={(e) =>
                  setNewCompetitor({ ...newCompetitor, website_url: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Twitter Handle
              </label>
              <Input
                placeholder="@handle"
                value={newCompetitor.twitter_handle || ""}
                onChange={(e) =>
                  setNewCompetitor({ ...newCompetitor, twitter_handle: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Instagram Handle
              </label>
              <Input
                placeholder="@handle"
                value={newCompetitor.instagram_handle || ""}
                onChange={(e) =>
                  setNewCompetitor({ ...newCompetitor, instagram_handle: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">LinkedIn URL</label>
              <Input
                placeholder="https://linkedin.com/company/..."
                value={newCompetitor.linkedin_url || ""}
                onChange={(e) =>
                  setNewCompetitor({ ...newCompetitor, linkedin_url: e.target.value })
                }
              />
            </div>
          </div>
          <Button className="mt-4" onClick={createCompetitor}>
            <Plus className="h-4 w-4 mr-2" />
            Add Competitor
          </Button>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Competitors Tab */}
        <TabsContent value="competitors" className="space-y-4">
          {competitors.length === 0 ? (
            <div className="bg-card rounded-lg border p-8 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No competitors tracked yet</p>
              <p className="text-sm">Add competitors to start monitoring their performance</p>
              <Button className="mt-4" onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Competitor
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {competitors.map((competitor) => (
                <div key={competitor.id} className="bg-card rounded-lg border p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {competitor.logo_url ? (
                        <img
                          src={competitor.logo_url}
                          alt={competitor.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold">{competitor.name}</h4>
                        {competitor.industry && (
                          <span className="text-xs text-muted-foreground">
                            {competitor.industry}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteCompetitor(competitor.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {competitor.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {competitor.description}
                    </p>
                  )}

                  {/* Social Links */}
                  <div className="flex gap-2 mb-4">
                    {competitor.twitter_handle && (
                      <a
                        href={`https://twitter.com/${competitor.twitter_handle.replace("@", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded bg-muted hover:bg-muted/80"
                      >
                        <Twitter className="h-4 w-4" />
                      </a>
                    )}
                    {competitor.instagram_handle && (
                      <a
                        href={`https://instagram.com/${competitor.instagram_handle.replace("@", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded bg-muted hover:bg-muted/80"
                      >
                        <Instagram className="h-4 w-4" />
                      </a>
                    )}
                    {competitor.linkedin_url && (
                      <a
                        href={competitor.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded bg-muted hover:bg-muted/80"
                      >
                        <Linkedin className="h-4 w-4" />
                      </a>
                    )}
                    {competitor.website_url && (
                      <a
                        href={competitor.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded bg-muted hover:bg-muted/80"
                      >
                        <Globe className="h-4 w-4" />
                      </a>
                    )}
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Followers</p>
                      <p className="font-semibold">
                        {competitor.total_followers.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Engagement</p>
                      <p className="font-semibold">
                        {competitor.avg_engagement_rate?.toFixed(2) || 0}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Posts/Week</p>
                      <p className="font-semibold">
                        {competitor.posting_frequency?.toFixed(1) || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg Likes</p>
                      <p className="font-semibold">
                        {competitor.avg_likes_per_post?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-4">
          {!comparison || comparison.competitors.length === 0 ? (
            <div className="bg-card rounded-lg border p-8 text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No comparison data available</p>
              <p className="text-sm">Add competitors to see comparative analysis</p>
            </div>
          ) : (
            <>
              {/* Radar Chart */}
              <div className="bg-card rounded-lg border p-4">
                <h3 className="font-semibold mb-4">Performance Comparison</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar
                      name="Followers"
                      dataKey="followers"
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.2}
                    />
                    <Radar
                      name="Engagement"
                      dataKey="engagement"
                      stroke="#10B981"
                      fill="#10B981"
                      fillOpacity={0.2}
                    />
                    <Radar
                      name="Posting Frequency"
                      dataKey="posting"
                      stroke="#F59E0B"
                      fill="#F59E0B"
                      fillOpacity={0.2}
                    />
                    <Radar
                      name="Avg Likes"
                      dataKey="likes"
                      stroke="#8B5CF6"
                      fill="#8B5CF6"
                      fillOpacity={0.2}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Bar Charts */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-card rounded-lg border p-4">
                  <h3 className="font-semibold mb-4">Followers</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={comparison.metrics.followers}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-card rounded-lg border p-4">
                  <h3 className="font-semibold mb-4">Engagement Rate (%)</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={comparison.metrics.engagement_rate}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-card rounded-lg border p-4">
                  <h3 className="font-semibold mb-4">Posts per Week</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={comparison.metrics.posting_frequency}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#F59E0B" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-card rounded-lg border p-4">
                  <h3 className="font-semibold mb-4">Average Likes per Post</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={comparison.metrics.avg_likes}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8B5CF6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          {insights.length === 0 ? (
            <div className="bg-card rounded-lg border p-8 text-center text-muted-foreground">
              <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No insights available</p>
              <p className="text-sm">
                Insights will be generated as competitor data is analyzed
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className={`bg-card rounded-lg border p-4 ${
                    insight.is_read ? "opacity-75" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            INSIGHT_TYPE_COLORS[insight.insight_type]
                          }`}
                        >
                          {insight.insight_type.charAt(0).toUpperCase() +
                            insight.insight_type.slice(1)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {insight.category}
                        </span>
                        <span
                          className={`text-xs ${PRIORITY_COLORS[insight.priority]}`}
                        >
                          {insight.priority} priority
                        </span>
                      </div>
                      <h4 className="font-semibold mb-1">{insight.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {insight.description}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {!insight.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markInsightRead(insight.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Mark Read
                        </Button>
                      )}
                      {insight.actionable && !insight.is_actioned && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markInsightActioned(insight.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Done
                        </Button>
                      )}
                      {insight.is_actioned && (
                        <span className="text-sm text-green-600 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Actioned
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
