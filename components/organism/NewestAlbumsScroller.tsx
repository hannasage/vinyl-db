import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import * as AlbumCard from '@/components/molecule/AlbumCard';

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

export default async function NewestAlbumsScroller() {
  const sb = createClient()
  const { data, error } = await sb.functions.invoke<AlbumListRes>('get-album-list', { body: {
    list: "newest"
  }});
  if (!data || error) redirect('/error')
  return (
    <section className="page-hero-container bg-dusk">
      <h2 className={"absolute section-heading top-10 left-4 lg:left-10"}>New Records</h2>
      <div className={"flex gap-8 px-8 items-center gradient-overlay overflow-x-auto snap-x snap-mandatory no-scrollbar"}>
        {data.list.map((album, idx) => (
          <div className={'flex mt-10'} key={`${album.id}-${idx}`}>
            <div className="">
              <AlbumCard.AlbumCard albumId={album.id} theme={'sunset'} callout />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
