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

export interface AlbumPreviewData {
  id: string;
  title: string;
  artist: string;
  year?: string;
  imageUrl?: string;
  confidence: 'high' | 'medium' | 'low';
  isConfirmed?: boolean;
  isRejected?: boolean;
}

// Chat Message Types
export interface ChatMessage extends SupabaseDbEntry {
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  type: 'text' | 'image' | 'collection_status';
  imageUrl?: string;
  imageFile?: File;
  data?: any; // For collection query results
}

// Album confirmation data interface
export interface AlbumConfirmationData {
  album: {
    title: string;
    artist: string;
    releaseYear?: number;
    artworkUrl?: string;
  };
  action: 'add' | 'remove';
  operationId: string; // Unique ID for tracking the operation
}

// Chat Message Type for the chat interface (with string IDs)
export interface ChatMessageType {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  type: 'text' | 'image' | 'collection_status' | 'album_action' | 'batch_progress' | 'album_confirmation';
  imageUrl?: string;
  imageFile?: File;
  data?: any; // For collection query results, album actions, batch progress, or album confirmation
}

export interface ChatResponse {
  message: string;
  timestamp: string;
  type?: 'general' | 'collection_query' | 'error' | 'album_confirmation';
  data?: any;
}

// Album Artwork Types
export interface AlbumArtworkImage {
  url: string;
  title: string;
  source: string;
  width: number;
  height: number;
  aspectRatio: number;
  estimatedQuality: 'excellent' | 'good' | 'acceptable' | 'low' | 'unknown';
}

export interface AlbumArtworkSearchResult {
  success: boolean;
  message: string;
  images: AlbumArtworkImage[];
  searchInfo: {
    albumName: string;
    artistName: string;
    releaseYear?: number;
    queriesUsed: string[];
    totalImagesFound: number;
    qualityBreakdown: Record<string, number>;
  };
}

export interface AlbumArtworkRequest {
  albumName: string;
  artistName: string;
  releaseYear?: number;
  preferredSize?: 'medium' | 'large' | 'extra_large';
  maxResults?: number;
}
