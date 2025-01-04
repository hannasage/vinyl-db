import { FullAlbumDetails } from '@/data/types';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { FilterSortBar } from '@/components/FilterSortBar';
import ContentGrid from '@/components/ContentGrid';
import { sortLegacyEntries } from '@/data/filters';
import React from 'react';

export interface AlbumListRes {
  list: Array<FullAlbumDetails>
}

export default async function Page() {
  const sb = createClient()
  const { data, error } = await sb.functions.invoke<AlbumListRes>('get-album-list', {
    body: {
      list: "all"
    }
  });
  if (!data || error) redirect('/error')
  return (
    <>
      <FilterSortBar />
      <ContentGrid data={sortLegacyEntries(data.list, "artist-alphabetical")} />
    </>
  )
}
