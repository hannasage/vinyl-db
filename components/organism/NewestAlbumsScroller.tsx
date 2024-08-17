import Link from 'next/link';
import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { FullAlbumDetails } from '@/data/types';
import AlbumCover from '@/components/molecule/AlbumCover';

export default async function NewestAlbumsScroller() {
  const sb = createClient()
  const { data, error } = await sb.functions.invoke<{ list: FullAlbumDetails[] }>('get-album-list', { body: {
    list: "newest"
  }});
  if (!data || error) redirect('/error')
  return (
    <section className={"flex flex-col w-[100%] mb-4"}>
      <h1 className={"text-xl mb-4 mx-2 lg:mx-6"}>New Additions</h1>
      <div className={"flex overflow-x-scroll w-[100%] no-scrollbar px-2 lg:px-6"}>
        {data.list.map((a, idx) => (
          <Link key={idx} href={`/album/${a.id}`}>
            <AlbumCover album={a} />
          </Link>
        ))}
      </div>
    </section>
  )
}
