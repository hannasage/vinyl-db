import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ContentGrid  from '@/components/ContentGrid'
import { FilterSortBar } from '@/components/FilterSortBar';
import { sortLegacyEntries } from '@/data/filters';
import { FullAlbumDetails } from '@/data/types';

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
