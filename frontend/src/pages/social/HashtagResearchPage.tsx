import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTutorial } from "@/context/TutorialContext";
import { getTutorialForStage } from "@/content/tutorials";
import { Button } from "@/components/ui/button";
import { TutorialPanel } from "@/components/tutorial";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Hash,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Search,
  FolderOpen,
  Star,
  Copy,
  Trash2,
  BarChart3,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import {
  TrackedHashtag,
  HashtagCollection,
  TrendingHashtag,
  HashtagStats,
  HashtagSuggestion,
  HashtagCategory,
  TrendDirection,
} from "@/types/hashtagResearch";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const CATEGORY_COLORS: Record<HashtagCategory, string> = {
  general: "#6B7280",
  industry: "#3B82F6",
  trending: "#F59E0B",
  branded: "#8B5CF6",
  campaign: "#10B981",
  seasonal: "#EC4899",
  niche: "#06B6D4",
};

const TREND_ICONS: Record<TrendDirection, typeof TrendingUp> = {
  rising: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
};

const TREND_COLORS: Record<TrendDirection, string> = {
  rising: "text-green-500",
  stable: "text-gray-500",
  declining: "text-red-500",
};

export function HashtagResearchPage() {
  const { token } = useAuth();
  const { tutorialMode } = useTutorial();
  const tutorial = getTutorialForStage("hashtag-research");
  const [activeTab, setActiveTab] = useState("hashtags");
  const [loading, setLoading] = useState(true);

  // Data states
  const [hashtags, setHashtags] = useState<TrackedHashtag[]>([]);
  const [collections, setCollections] = useState<HashtagCollection[]>([]);
  const [trending, setTrending] = useState<TrendingHashtag[]>([]);
  const [stats, setStats] = useState<HashtagStats | null>(null);
  const [suggestions, setSuggestions] = useState<HashtagSuggestion[]>([]);

  // Form states
  const [newHashtag, setNewHashtag] = useState("");
  const [newCategory, setNewCategory] = useState<HashtagCategory>("general");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionHashtags, setNewCollectionHashtags] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadHashtags(),
        loadCollections(),
        loadTrending(),
        loadStats(),
        loadSuggestions(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadHashtags = async () => {
    const res = await fetch(`${API_URL}/api/v1/hashtags/hashtags`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setHashtags(await res.json());
    }
  };

  const loadCollections = async () => {
    const res = await fetch(`${API_URL}/api/v1/hashtags/collections`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setCollections(await res.json());
    }
  };

  const loadTrending = async () => {
    const res = await fetch(`${API_URL}/api/v1/hashtags/trending`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setTrending(await res.json());
    }
  };

  const loadStats = async () => {
    const res = await fetch(`${API_URL}/api/v1/hashtags/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setStats(await res.json());
    }
  };

  const loadSuggestions = async () => {
    const res = await fetch(`${API_URL}/api/v1/hashtags/suggestions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    }
  };

  const createHashtag = async () => {
    if (!newHashtag.trim()) return;

    const res = await fetch(`${API_URL}/api/v1/hashtags/hashtags`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        hashtag: newHashtag,
        category: newCategory,
      }),
    });

    if (res.ok) {
      setNewHashtag("");
      loadHashtags();
      loadStats();
    }
  };

  const deleteHashtag = async (id: string) => {
    const res = await fetch(`${API_URL}/api/v1/hashtags/hashtags/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      loadHashtags();
      loadStats();
    }
  };

  const createCollection = async () => {
    if (!newCollectionName.trim() || !newCollectionHashtags.trim()) return;

    const res = await fetch(`${API_URL}/api/v1/hashtags/collections`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: newCollectionName,
        hashtags: newCollectionHashtags,
      }),
    });

    if (res.ok) {
      setNewCollectionName("");
      setNewCollectionHashtags("");
      loadCollections();
      loadStats();
    }
  };

  const deleteCollection = async (id: string) => {
    const res = await fetch(`${API_URL}/api/v1/hashtags/collections/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      loadCollections();
      loadStats();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const filteredHashtags = hashtags.filter((h) =>
    h.hashtag.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categoryData = stats
    ? Object.entries(stats.category_breakdown).map(([name, value]) => ({
        name,
        value,
        color: CATEGORY_COLORS[name as HashtagCategory] || "#6B7280",
      }))
    : [];

  const trendData = stats
    ? Object.entries(stats.trend_breakdown).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))
    : [];

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
        <TutorialPanel tutorial={tutorial} stageId="hashtag-research" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hashtag Research</h1>
          <p className="text-muted-foreground">
            Track, analyze, and discover hashtags for better reach
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Hash className="h-4 w-4" />
              Tracked Hashtags
            </div>
            <p className="text-2xl font-bold mt-2">{stats?.total_hashtags || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <FolderOpen className="h-4 w-4" />
              Collections
            </div>
            <p className="text-2xl font-bold mt-2">{stats?.total_collections || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Rising
            </div>
            <p className="text-2xl font-bold mt-2">
              {stats?.trend_breakdown?.rising || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Declining
            </div>
            <p className="text-2xl font-bold mt-2">
              {stats?.trend_breakdown?.declining || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="hashtags">My Hashtags</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="trending">Trending</TabsTrigger>
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* My Hashtags Tab */}
        <TabsContent value="hashtags" className="space-y-6">
          {/* Add Hashtag Form */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Track New Hashtag</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Enter hashtag (e.g., #marketing)"
                    value={newHashtag}
                    onChange={(e) => setNewHashtag(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createHashtag()}
                  />
                </div>
                <select
                  className="px-3 py-2 border rounded-md bg-background text-sm"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as HashtagCategory)}
                >
                  <option value="general">General</option>
                  <option value="industry">Industry</option>
                  <option value="trending">Trending</option>
                  <option value="branded">Branded</option>
                  <option value="campaign">Campaign</option>
                  <option value="seasonal">Seasonal</option>
                  <option value="niche">Niche</option>
                </select>
                <Button onClick={createHashtag}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search hashtags..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Hashtag List */}
          <Card>
            <CardContent className="p-0 divide-y">
              {filteredHashtags.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Hash className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hashtags tracked yet</p>
                  <p className="text-sm">Add hashtags above to start tracking performance</p>
                </div>
              ) : (
              filteredHashtags.map((hashtag) => {
                const TrendIcon = TREND_ICONS[hashtag.trend_direction];
                return (
                  <div key={hashtag.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-primary">
                          {hashtag.hashtag}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${CATEGORY_COLORS[hashtag.category]}20`,
                            color: CATEGORY_COLORS[hashtag.category],
                          }}
                        >
                          {hashtag.category}
                        </span>
                      </div>
                      <TrendIcon
                        className={`h-4 w-4 ${TREND_COLORS[hashtag.trend_direction]}`}
                      />
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Engagement</p>
                        <p className="font-semibold">
                          {hashtag.total_engagement.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Reach</p>
                        <p className="font-semibold">
                          {hashtag.total_reach.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Used</p>
                        <p className="font-semibold">{hashtag.times_used}x</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(hashtag.hashtag)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deleteHashtag(hashtag.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Collections Tab */}
        <TabsContent value="collections" className="space-y-6">
          {/* Add Collection Form */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Create Collection</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <Input
                placeholder="Collection name (e.g., Product Launch)"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
              />
              <Input
                placeholder="Hashtags (comma-separated: #launch, #product, #new)"
                value={newCollectionHashtags}
                onChange={(e) => setNewCollectionHashtags(e.target.value)}
              />
              <Button onClick={createCollection}>
                <Plus className="h-4 w-4 mr-2" />
                Create Collection
              </Button>
            </CardContent>
          </Card>

          {/* Collections Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {collections.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No collections yet</p>
                  <p className="text-sm">Create collections for quick hashtag reuse</p>
                </CardContent>
              </Card>
            ) : (
              collections.map((collection) => (
                <Card key={collection.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold">{collection.name}</h4>
                      </div>
                      <div className="flex gap-1">
                        {collection.is_favorite && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyToClipboard(collection.hashtags)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteCollection(collection.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-primary mb-3 line-clamp-2">
                      {collection.hashtags}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {collection.hashtags.split(",").length} hashtags
                      </span>
                      <span>Used {collection.times_used}x</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Trending Tab */}
        <TabsContent value="trending" className="space-y-6">
          {trending.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No trending data available</p>
                <p className="text-sm">
                  Trending hashtags will appear here when detected
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 divide-y">
              {trending.map((hashtag, index) => (
                <div key={hashtag.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-muted-foreground w-8">
                      #{index + 1}
                    </span>
                    <div>
                      <span className="text-lg font-semibold text-primary">
                        {hashtag.hashtag}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded bg-muted">
                          {hashtag.platform}
                        </span>
                        {hashtag.category && (
                          <span className="text-xs text-muted-foreground">
                            {hashtag.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Volume</p>
                      <p className="font-semibold">
                        {hashtag.volume.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Velocity</p>
                      <p className="font-semibold text-green-500">
                        +{hashtag.velocity.toFixed(1)}%
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewHashtag(hashtag.hashtag);
                        setActiveTab("hashtags");
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Track
                    </Button>
                  </div>
                </div>
              ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Suggestions Tab */}
        <TabsContent value="suggestions" className="space-y-6">
          {suggestions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No suggestions available</p>
                <p className="text-sm">
                  Track more hashtags and post content to get personalized suggestions
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {suggestions.map((suggestion, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-lg font-semibold text-primary">
                        {suggestion.hashtag}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          suggestion.source === "top_performing"
                            ? "bg-green-100 text-green-700"
                            : suggestion.source === "trending"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {suggestion.source.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {suggestion.reason}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        {suggestion.engagement_rate && (
                          <span>{suggestion.engagement_rate.toFixed(1)}% eng.</span>
                        )}
                        {suggestion.volume && (
                          <span>{suggestion.volume.toLocaleString()} posts</span>
                        )}
                        {suggestion.platform && <span>{suggestion.platform}</span>}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(suggestion.hashtag)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setNewHashtag(suggestion.hashtag);
                            setActiveTab("hashtags");
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Track
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Category Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Category Distribution</CardTitle>
              </CardHeader>
              <CardContent>
              {categoryData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
              </CardContent>
            </Card>

            {/* Trend Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Trend Distribution</CardTitle>
              </CardHeader>
              <CardContent>
              {trendData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              )}
              </CardContent>
            </Card>

            {/* Top Performing */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Top Performing Hashtags</CardTitle>
              </CardHeader>
              <CardContent>
              {stats?.top_hashtags && stats.top_hashtags.length > 0 ? (
                <div className="space-y-3">
                  {stats.top_hashtags.map((hashtag, index) => {
                    const TrendIcon = TREND_ICONS[hashtag.trend_direction];
                    return (
                      <div
                        key={hashtag.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-muted-foreground">
                            {index + 1}
                          </span>
                          <span className="font-medium text-primary">
                            {hashtag.hashtag}
                          </span>
                          <TrendIcon
                            className={`h-4 w-4 ${
                              TREND_COLORS[hashtag.trend_direction]
                            }`}
                          />
                        </div>
                        <span className="font-semibold">
                          {hashtag.total_engagement.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
              </CardContent>
            </Card>

            {/* Most Used Collections */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Most Used Collections</CardTitle>
              </CardHeader>
              <CardContent>
              {stats?.top_collections && stats.top_collections.length > 0 ? (
                <div className="space-y-3">
                  {stats.top_collections.map((collection, index) => (
                    <div
                      key={collection.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground">
                          {index + 1}
                        </span>
                        <div>
                          <span className="font-medium">{collection.name}</span>
                          <p className="text-xs text-muted-foreground">
                            {collection.hashtag_count} hashtags
                          </p>
                        </div>
                      </div>
                      <span className="font-semibold">
                        {collection.times_used}x used
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  No collections yet
                </div>
              )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
