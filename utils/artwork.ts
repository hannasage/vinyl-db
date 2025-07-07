import { createClient } from '@/utils/supabase/client';
import { AlbumArtworkSearchResult, AlbumArtworkRequest } from '@/data/types';

export async function fetchAlbumArtwork(request: AlbumArtworkRequest): Promise<AlbumArtworkSearchResult> {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase.functions.invoke<AlbumArtworkSearchResult>('fetch-album-artwork', {
      body: request
    });

    if (error) {
      console.error('Error fetching album artwork:', error);
      throw new Error(error.message || 'Failed to fetch album artwork');
    }

    if (!data) {
      throw new Error('No data returned from artwork search');
    }

    return data;
  } catch (error) {
    console.error('Error in fetchAlbumArtwork:', error);
    throw error;
  }
}

// Helper function to get the best quality image from search results
export function getBestArtworkImage(images: AlbumArtworkSearchResult['images']): string | null {
  if (!images || images.length === 0) return null;
  
  // Sort by quality and return the best one
  const qualityScores: Record<string, number> = { excellent: 4, good: 3, acceptable: 2, low: 1, unknown: 0 };
  
  const sortedImages = [...images].sort((a, b) => {
    const qualityA = qualityScores[a.estimatedQuality] ?? qualityScores.unknown;
    const qualityB = qualityScores[b.estimatedQuality] ?? qualityScores.unknown;
    const qualityDiff = qualityB - qualityA;
    if (qualityDiff !== 0) return qualityDiff;
    
    // If quality is same, prefer more square images
    const aspectDiffA = Math.abs(1 - a.aspectRatio);
    const aspectDiffB = Math.abs(1 - b.aspectRatio);
    return aspectDiffA - aspectDiffB;
  });

  return sortedImages[0].url;
}

// Helper function to validate image URL
export function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'https:' && 
           (!!parsedUrl.pathname.match(/\.(jpg|jpeg|png|webp|gif)$/i) || 
            parsedUrl.hostname.includes('image') ||
            parsedUrl.hostname.includes('img'));
  } catch {
    return false;
  }
} 