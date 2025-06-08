import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { sortLegacyEntries } from '@/data/filters';
import { FullAlbumDetails } from '@/data/types';
import AddAlbumClientWrapper from '@/components/AddAlbumClientWrapper';
import AddArtistButton from '@/components/AddArtistButton';

export interface AlbumListRes {
  list: Array<FullAlbumDetails>;
}

export default async function V2Page() {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke<AlbumListRes>('get-album-list', {
    body: {
      list: "all"
    }
  });

  if (!data || error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Failed to load albums.</div>
      </div>
    );
  }

  const sortedAlbums = sortLegacyEntries(data.list, "artist-alphabetical");

  return (
    <>
      <AddAlbumClientWrapper albums={sortedAlbums} />
    </>
  );
}
