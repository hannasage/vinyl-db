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

// Chat Message Type for the chat interface (with string IDs)
export interface ChatMessageType {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  type: 'text' | 'image' | 'collection_status';
  imageUrl?: string;
  imageFile?: File;
  data?: any; // For collection query results
}

export interface ChatResponse {
  message: string;
  timestamp: string;
  type?: 'general' | 'collection_query' | 'error';
  data?: any;
}
