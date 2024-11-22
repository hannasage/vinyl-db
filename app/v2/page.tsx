import React from 'react';
import { AlbumArtBox } from '@/components/boxes/AlbumArtBox';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import DotMatrixBackground from '@/components/DotMatrixBackground';

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
      list: "newest"
    }});
  if (!data || error) redirect('/error')
  return (
    <>
      <DotMatrixBackground />
      <div className={"flex"}>
        {data.list.map((a, i) => <AlbumArtBox key={i} size={500} {...a} />)}
      </div>
    </>
  );
}