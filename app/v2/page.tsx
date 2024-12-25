import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ContentGrid  from '@/components/sections/ContentGrid'

interface AlbumListRes {
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
  const { data, error } = await sb.functions.invoke<AlbumListRes>('get-album-list', { body: {
      list: "all"
    }});
  if (!data || error) redirect('/error')

  const FilterSortBar = () => (
    <div className={'flex w-screen bg-brandLightGray drop-shadow-lg p-5 sticky'}>
      <h1
        className={'font-light text-manillaDark text-4xl spacing tracking-wider'}>
        vinyl
      </h1>
    </div>
  );



  return (
    <>
      <FilterSortBar />
      <ContentGrid data={data} />
    </>
  )
    ;
}
