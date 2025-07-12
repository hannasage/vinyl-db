import React from 'react';
import { FullAlbumDetails } from '@/data/types';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import AlbumBackdrop from '@/components/landing/AlbumBackdrop';
import LandingContent from '@/components/landing/LandingContent';
import { stableRandomSelect } from '@/utils/stableRandom';

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
  
  // Use stable random selection for the backdrop
  const albumsWithArtwork = data.list.filter(album => album.artwork_url);
  const seed = `${albumsWithArtwork.length}-${albumsWithArtwork[0]?.title || 'default'}`;
  
  const randomizedAlbums = stableRandomSelect(albumsWithArtwork, 96, seed);
  
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AlbumBackdrop albums={randomizedAlbums} />
      <LandingContent />
    </div>
  );
} 