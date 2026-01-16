export type AssetType = "image" | "video" | "gif" | "template" | "snippet" | "hashtag_set";

export type AssetCategory =
  | "general"
  | "branding"
  | "products"
  | "events"
  | "seasonal"
  | "testimonials"
  | "educational"
  | "promotional"
  | "behind_the_scenes"
  | "user_generated";

export interface ContentAsset {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  asset_type: AssetType;
  category: AssetCategory;
  tags?: string;
  file_url?: string;
  thumbnail_url?: string;
  file_size?: number;
  mime_type?: string;
  width?: number;
  height?: number;
  duration_seconds?: number;
  content?: string;
  platforms?: string;
  usage_count: number;
  last_used_at?: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContentAssetCreate {
  name: string;
  description?: string;
  asset_type: AssetType;
  category?: AssetCategory;
  tags?: string;
  file_url?: string;
  thumbnail_url?: string;
  file_size?: number;
  mime_type?: string;
  width?: number;
  height?: number;
  duration_seconds?: number;
  content?: string;
  platforms?: string;
}

export interface ContentAssetUpdate {
  name?: string;
  description?: string;
  category?: AssetCategory;
  tags?: string;
  content?: string;
  platforms?: string;
  is_favorite?: boolean;
}

export interface ContentCollection {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  color?: string;
  asset_count: number;
  created_at: string;
  updated_at: string;
}

export interface ContentCollectionCreate {
  name: string;
  description?: string;
  color?: string;
}

export interface ContentCollectionUpdate {
  name?: string;
  description?: string;
  color?: string;
}

export interface ContentLibraryStats {
  total_assets: number;
  total_collections: number;
  favorites: number;
  by_type: Record<AssetType, number>;
  by_category: Record<string, number>;
  most_used: Array<{
    id: string;
    name: string;
    type: AssetType;
    usage_count: number;
  }>;
}

export interface PaginatedAssets {
  items: ContentAsset[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}
