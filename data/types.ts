export interface SupabaseDbEntry {
  id: number;
  created_at: string;
}

export interface Album extends SupabaseDbEntry {
  title: string;
  artist_id: number;
  purchase_date: string;
  acquired_date: string;
  release_year: number;
  variant: string;
  preordered: boolean;
  artwork_url: string;
}

export type FullAlbumDetails = Album & { artist_name: string; }

export interface Artist extends SupabaseDbEntry { name: string }
export interface Vibe extends SupabaseDbEntry { label: string, type: "genre" | "vibe" }

export interface CollectionEntry extends SupabaseDbEntry {
  albumId: number;
  collectionId: number;
  layout: string;
  layoutProps: object;
  position: number;
}
export interface Collection extends SupabaseDbEntry {
  bannerImageUrl: string | null;
  coverImageUrl: string | null;
  curator: string; // uuid
  longDescription: string;
  shortDescription: string;
  title: string;
}

export interface AlbumDraft {
  id: string;  // uuid
  created_at: string;
  updated_at: string;
  title: string | null;
  artist_id: number | null;
  variant: string | null;
  size: number;
  purchase_date: string | null;
  acquired_date: string | null;
  preordered: boolean;
  artwork_url: string | null;
  release_year: number | null;
  receipt_id: string | null;  // uuid
  info_approved: boolean;
  is_approved: boolean;
  reviewed_at: string | null;
  original_extraction: {
    title?: string;
    artist_name?: string;
    variant?: string;
    size?: number;
    purchase_date?: string;
    acquired_date?: string;
    [key: string]: any;
  } | null;
  review_changes: {
    field: string;
    old_value: any;
    new_value: any;
    changed_at: string;
    changed_by: string;
  }[] | null;
}

export type FullAlbumDraft = AlbumDraft & {
  artist_name?: string;
  retailer_name?: string;
};
