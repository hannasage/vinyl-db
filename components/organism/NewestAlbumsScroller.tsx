import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { FullAlbumDetails } from '@/data/types';
import Image from 'next/image';
import * as AlbumCard from '@/components/molecule/AlbumCard';
import classNames from 'classnames';
import Link from 'next/link';
import AlbumCover from '@/components/molecule/AlbumCover';
import { AlbumBlurb } from '@/components/molecule/AlbumBlurb';

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
  // return (
  //   <section className={"flex flex-col w-[100%] page-left-padding mb-4 "}>
  //     <div className={"flex align-middle mb-4"}>
  //       <h1 className={'text-xl mr-10 tracking-tight'}>New Additions</h1>
  //       <Link className={'leading-7'} href={'/browse/newest'}>See all</Link>
  //     </div>
  //     <div className={'flex flex-col flex-wrap max-h-[500px] overflow-x-scroll w-[100%] no-scrollbar'}>
  //       {data.list.map((a, idx) => (
  //         <div key={`${a.title}-cover-${idx}`} className={"h-52 w-52"}>
  //           <AlbumCover album={a} containerSize={52} />
  //         </div>
  //       ))}
  //     </div>
  //   </section>
  // )
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
