import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Image,
  Video,
  FileText,
  Hash,
  Folder,
  Plus,
  Search,
  Star,
  StarOff,
  MoreVertical,
  Trash2,
  Edit,
  Copy,
  Calendar,
  BarChart2,
  Inbox,
  Settings,
  Grid,
  List,
  Filter,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TutorialPanel } from "@/components/tutorial";
import { useApi } from "@/hooks/useApi";
import { useTutorial } from "@/context/TutorialContext";
import { getTutorialForStage } from "@/content/tutorials";
import type {
  ContentAsset,
  ContentCollection,
  ContentLibraryStats,
  PaginatedAssets,
  AssetType,
  AssetCategory,
} from "@/types/contentLibrary";

const assetTypeIcons: Record<AssetType, React.ComponentType<{ className?: string }>> = {
  image: Image,
  video: Video,
  gif: Image,
  template: FileText,
  snippet: FileText,
  hashtag_set: Hash,
};

const assetTypeLabels: Record<AssetType, string> = {
  image: "Image",
  video: "Video",
  gif: "GIF",
  template: "Template",
  snippet: "Snippet",
  hashtag_set: "Hashtag Set",
};

const categoryLabels: Record<AssetCategory, string> = {
  general: "General",
  branding: "Branding",
  products: "Products",
  events: "Events",
  seasonal: "Seasonal",
  testimonials: "Testimonials",
  educational: "Educational",
  promotional: "Promotional",
  behind_the_scenes: "Behind the Scenes",
  user_generated: "User Generated",
};

export function ContentLibraryPage() {
  const { tutorialMode } = useTutorial();
  const tutorial = getTutorialForStage("content-library");
  const { get, post, patch, del } = useApi();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [collections, setCollections] = useState<ContentCollection[]>([]);
  const [stats, setStats] = useState<ContentLibraryStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<AssetType | "">("");
  const [filterCategory, setFilterCategory] = useState<AssetCategory | "">("");
  const [filterCollection, setFilterCollection] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Sheet states
  const [showCreateAsset, setShowCreateAsset] = useState(false);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [editingAsset, setEditingAsset] = useState<ContentAsset | null>(null);

  // Create asset form
  const [newAsset, setNewAsset] = useState({
    name: "",
    description: "",
    asset_type: "template" as AssetType,
    category: "general" as AssetCategory,
    content: "",
    tags: "",
    platforms: "linkedin,twitter,facebook",
  });

  // Create collection form
  const [newCollection, setNewCollection] = useState({
    name: "",
    description: "",
    color: "#3b82f6",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("page_size", "20");
      if (search) params.set("search", search);
      if (filterType) params.set("asset_type", filterType);
      if (filterCategory) params.set("category", filterCategory);
      if (filterCollection) params.set("collection_id", filterCollection);
      if (favoritesOnly) params.set("favorites_only", "true");

      const [assetsData, collectionsData, statsData] = await Promise.all([
        get(`/content-library/assets?${params.toString()}`),
        get("/content-library/collections"),
        get("/content-library/stats"),
      ]);

      if (assetsData) {
        const paginated = assetsData as PaginatedAssets;
        setAssets(paginated.items);
        setTotal(paginated.total);
      }
      if (collectionsData) setCollections(collectionsData as ContentCollection[]);
      if (statsData) setStats(statsData as ContentLibraryStats);
    } catch (error) {
      console.error("Failed to fetch content library:", error);
    } finally {
      setLoading(false);
    }
  }, [get, page, search, filterType, filterCategory, filterCollection, favoritesOnly]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateAsset = async () => {
    try {
      await post("/content-library/assets", newAsset);
      setShowCreateAsset(false);
      setNewAsset({
        name: "",
        description: "",
        asset_type: "template",
        category: "general",
        content: "",
        tags: "",
        platforms: "linkedin,twitter,facebook",
      });
      fetchData();
    } catch (error) {
      console.error("Failed to create asset:", error);
    }
  };

  const handleCreateCollection = async () => {
    try {
      await post("/content-library/collections", newCollection);
      setShowCreateCollection(false);
      setNewCollection({ name: "", description: "", color: "#3b82f6" });
      fetchData();
    } catch (error) {
      console.error("Failed to create collection:", error);
    }
  };

  const handleToggleFavorite = async (asset: ContentAsset) => {
    try {
      await post(`/content-library/assets/${asset.id}/favorite`, {});
      fetchData();
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;
    try {
      await del(`/content-library/assets/${assetId}`);
      fetchData();
    } catch (error) {
      console.error("Failed to delete asset:", error);
    }
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const clearFilters = () => {
    setSearch("");
    setFilterType("");
    setFilterCategory("");
    setFilterCollection("");
    setFavoritesOnly(false);
  };

  const hasFilters = search || filterType || filterCategory || filterCollection || favoritesOnly;

  return (
    <div className="space-y-6">
      {tutorialMode && tutorial && (
        <TutorialPanel tutorial={tutorial} stageId="content-library" />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Library</h1>
          <p className="text-muted-foreground">
            Store and organize reusable content assets
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Total Assets</p>
              <p className="text-2xl font-bold mt-2">{stats.total_assets}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Collections</p>
              <p className="text-2xl font-bold mt-2">{stats.total_collections}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Favorites</p>
              <p className="text-2xl font-bold mt-2">{stats.favorites}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Templates</p>
              <p className="text-2xl font-bold mt-2">{stats.by_type?.template || 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions and Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Button onClick={() => setShowCreateAsset(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Asset
        </Button>
        <Button variant="outline" onClick={() => setShowCreateCollection(true)}>
          <Folder className="mr-2 h-4 w-4" />
          New Collection
        </Button>

        <div className="flex-1" />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-64"
          />
        </div>

        <Select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as AssetType | "")}
          className="w-36"
        >
          <option value="">All Types</option>
          {Object.entries(assetTypeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </Select>

        <Select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as AssetCategory | "")}
          className="w-40"
        >
          <option value="">All Categories</option>
          {Object.entries(categoryLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </Select>

        {collections.length > 0 && (
          <Select
            value={filterCollection}
            onChange={(e) => setFilterCollection(e.target.value)}
            className="w-40"
          >
            <option value="">All Collections</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        )}

        <Button
          variant={favoritesOnly ? "default" : "outline"}
          size="icon"
          onClick={() => setFavoritesOnly(!favoritesOnly)}
        >
          <Star className="h-4 w-4" />
        </Button>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}

        <div className="flex border rounded-md">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="rounded-r-none"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="rounded-l-none"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Collections */}
      {collections.length > 0 && !filterCollection && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {collections.map((collection) => (
            <button
              key={collection.id}
              onClick={() => setFilterCollection(collection.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card hover:bg-muted transition-colors shrink-0"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: collection.color || "#3b82f6" }}
              />
              <span className="text-sm font-medium">{collection.name}</span>
              <Badge variant="secondary" className="text-xs">
                {collection.asset_count}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {/* Assets Grid/List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      ) : assets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No assets found</h3>
            <p className="text-muted-foreground mb-4">
              {hasFilters
                ? "Try adjusting your filters"
                : "Start by adding your first content asset"}
            </p>
            {!hasFilters && (
              <Button onClick={() => setShowCreateAsset(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Asset
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => {
            const TypeIcon = assetTypeIcons[asset.asset_type];
            return (
              <Card key={asset.id} className="overflow-hidden">
                {asset.thumbnail_url || asset.file_url ? (
                  <div className="aspect-video bg-muted relative">
                    <img
                      src={asset.thumbnail_url || asset.file_url}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                    />
                    <Badge className="absolute top-2 right-2">
                      {assetTypeLabels[asset.asset_type]}
                    </Badge>
                  </div>
                ) : (
                  <div className="aspect-video bg-muted flex items-center justify-center relative">
                    <TypeIcon className="h-12 w-12 text-muted-foreground" />
                    <Badge className="absolute top-2 right-2">
                      {assetTypeLabels[asset.asset_type]}
                    </Badge>
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{asset.name}</h3>
                      {asset.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {asset.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggleFavorite(asset)}
                      className="shrink-0"
                    >
                      {asset.is_favorite ? (
                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <StarOff className="h-5 w-5 text-muted-foreground hover:text-yellow-500" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="outline" className="text-xs">
                      {categoryLabels[asset.category]}
                    </Badge>
                    {asset.usage_count > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Used {asset.usage_count}x
                      </span>
                    )}
                  </div>
                  {asset.content && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleCopyContent(asset.content || "")}
                      >
                        <Copy className="mr-1 h-3 w-3" />
                        Copy
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAsset(asset.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {assets.map((asset) => {
            const TypeIcon = assetTypeIcons[asset.asset_type];
            return (
              <Card key={asset.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <TypeIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{asset.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {asset.description || asset.content?.slice(0, 100)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{categoryLabels[asset.category]}</Badge>
                      <Badge>{assetTypeLabels[asset.asset_type]}</Badge>
                      <button onClick={() => handleToggleFavorite(asset)}>
                        {asset.is_favorite ? (
                          <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                        ) : (
                          <StarOff className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                      {asset.content && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyContent(asset.content || "")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAsset(asset.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <Button
            variant="outline"
            disabled={page >= Math.ceil(total / 20)}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Create Asset Sheet */}
      <Sheet open={showCreateAsset} onOpenChange={setShowCreateAsset}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add New Asset</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={newAsset.name}
                onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                placeholder="Asset name"
              />
            </div>

            <div className="space-y-2">
              <Label>Type *</Label>
              <Select
                value={newAsset.asset_type}
                onChange={(e) => setNewAsset({ ...newAsset, asset_type: e.target.value as AssetType })}
              >
                {Object.entries(assetTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={newAsset.category}
                onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value as AssetCategory })}
              >
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={newAsset.description}
                onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={newAsset.content}
                onChange={(e) => setNewAsset({ ...newAsset, content: e.target.value })}
                placeholder="Template content, snippet text, or hashtags..."
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                value={newAsset.tags}
                onChange={(e) => setNewAsset({ ...newAsset, tags: e.target.value })}
                placeholder="marketing, social, promo"
              />
            </div>

            <div className="space-y-2">
              <Label>Platforms (comma-separated)</Label>
              <Input
                value={newAsset.platforms}
                onChange={(e) => setNewAsset({ ...newAsset, platforms: e.target.value })}
                placeholder="linkedin,twitter,facebook"
              />
            </div>

            <Button
              className="w-full"
              onClick={handleCreateAsset}
              disabled={!newAsset.name.trim()}
            >
              Create Asset
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Create Collection Sheet */}
      <Sheet open={showCreateCollection} onOpenChange={setShowCreateCollection}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Create Collection</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={newCollection.name}
                onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
                placeholder="Collection name"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={newCollection.description}
                onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899"].map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full ${newCollection.color === color ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewCollection({ ...newCollection, color })}
                  />
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleCreateCollection}
              disabled={!newCollection.name.trim()}
            >
              Create Collection
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
