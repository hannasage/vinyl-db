import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { FullAlbumDetails } from '@/data/types';
import { AlbumCard } from '@/components/molecule/AlbumCard';

export type Props = { albumId: number; blurb: string; }

export const id = 'album-blurb'
export function propsCheck(p: Props) {
  return !!p.blurb && !!p.albumId
}

type GetAlbumRes = FullAlbumDetails

export async function AlbumBlurb({ albumId, blurb }: Props) {
  const sb = createClient()
  const { data: album, error: albumError } = await sb.functions.invoke<GetAlbumRes>('get-album', {
    body: { albumId: albumId }
  });
  if (!album || albumError) redirect('/error')
  return (
    <div className={"px-4 md:px-8 mb-8 w-full max-w-screen-lg mx-auto"}>
      <div className={"w-full max-w-screen-lg mx-auto p-0.5 rounded-md bg-gradient-to-br from-purple-300 to-blue-500 shadow-lg"}>
        <div className={"max-w-screen-lg mx-auto bg-black p-8 rounded-md"}>
          <section className={"flex flex-col md:flex-row w-full max-w-screen-lg mx-auto justify-center content-center"}>
            <AlbumCard {...album} showArtist={false} background={false} />
            <p className={'my-auto text-justify max-w-[500px] leading-6 tracking-tight p-8'}>{blurb}</p>
          </section>
        </div>
      </div>
    </div>
  )
}

export function render(props: Props) {
  return propsCheck(props) ? <AlbumBlurb key={`blurb-${props.albumId}`} {...props} /> : <p>{id} failed propsCheck</p>
}
