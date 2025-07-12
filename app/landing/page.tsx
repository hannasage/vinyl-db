import { FullAlbumDetails } from '@/data/types';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import AlbumBackdrop from '@/components/landing/AlbumBackdrop';
import LandingContent from '@/components/landing/LandingContent';

export interface AlbumListRes {
  list: Array<FullAlbumDetails>
}

export default async function LandingPage() {
  const sb = createClient()
  const { data, error } = await sb.functions.invoke<AlbumListRes>('get-album-list', {
    body: {
      list: "all"
    }
  });
  
  if (!data || error) redirect('/error')
  
  // Randomize the album list for the backdrop
  const randomizedAlbums = data.list
    .filter(album => album.artwork_url) // Only include albums with artwork
    .sort(() => Math.random() - 0.5)
    .slice(0, 96); // Limit to 96 albums for performance (12x8 grid)
  
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AlbumBackdrop albums={randomizedAlbums} />
      <LandingContent />
    </div>
  );
} 