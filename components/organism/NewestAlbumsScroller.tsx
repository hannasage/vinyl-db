import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { FullAlbumDetails } from '@/data/types';
import AlbumCover, { AlbumCoverContainer } from '@/components/molecule/AlbumCover';
import Link from 'next/link';

export default async function NewestAlbumsScroller() {
  const sb = createClient()
  const { data, error } = await sb.functions.invoke<{ list: FullAlbumDetails[] }>('get-album-list', { body: {
    list: "newest"
  }});
  if (!data || error) redirect('/error')
  return (
    <section className={"flex flex-col w-[100%] mb-4"}>
      <h1 className={'text-xl mb-4 mx-2 lg:mx-6 tracking-tight'}>New Additions</h1>
      <div className={'flex flex-col flex-wrap max-h-[500px] overflow-x-scroll w-[100%] no-scrollbar px-2 lg:px-6'}>
        {data.list.map((a, idx) => (
          <div key={`${a.title}-cover-${idx}`} className={"h-52 w-52"}>
            <AlbumCover album={a} containerSize={52} />
          </div>
        ))}
        {/* Custom end-of-list link that matches Album cover style */}
        <Link href={"/browse/newest"}>
          <AlbumCoverContainer
            className={"flex justify-center w-52 h-52 align-middle bg-gradient-to-bl from-gray-500 to-gray-700"}>
            <p className={"my-auto text-xl"}>See All &rarr;</p>
          </AlbumCoverContainer>
        </Link>
      </div>
    </section>
  )
}
