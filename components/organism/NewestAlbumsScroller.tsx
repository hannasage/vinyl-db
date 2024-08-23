import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { FullAlbumDetails } from '@/data/types';
import AlbumCover from '@/components/molecule/AlbumCover';
import Link from 'next/link';

export default async function NewestAlbumsScroller() {
  const sb = createClient()
  const { data, error } = await sb.functions.invoke<{ list: FullAlbumDetails[] }>('get-album-list', { body: {
    list: "newest"
  }});
  if (!data || error) redirect('/error')
  return (
    <section className={"flex flex-col w-[100%] page-left-padding mb-4 "}>
      <div className={"flex align-middle mb-4"}>
        <h1 className={'text-xl mr-10 tracking-tight'}>New Additions</h1>
        <Link className={'leading-7'} href={'/browse/newest'}>See all</Link>
      </div>
      <div className={'flex flex-col flex-wrap max-h-[500px] overflow-x-scroll w-[100%] no-scrollbar'}>
        {data.list.map((a, idx) => (
          <div key={`${a.title}-cover-${idx}`} className={"h-52 w-52"}>
            <AlbumCover album={a} containerSize={52} />
          </div>
        ))}
      </div>
    </section>
  )
}
