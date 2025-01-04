import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ContentGrid  from '@/components/sections/ContentGrid'
import { FilterSortBar } from '@/components/FilterSortBar';

export interface AlbumListRes {
  list: Array<{
    id: number,
    title: string,
    artist_id: number,
    acquired_date: string,
    artist_name: string,
    artwork_url: string,
  }>
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
      <ContentGrid data={data as AlbumListRes} />
    </>
  )
    ;
}
