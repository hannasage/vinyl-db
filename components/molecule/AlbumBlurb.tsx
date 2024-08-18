import React from 'react';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { FullAlbumDetails } from '@/data/types';

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
    <section>
      <Image src={album.artwork_url} alt={`album art for ${album.title} - ${album.artist_name}`} width={300} height={300} />
      <p>{blurb}</p>
    </section>
  )
}

export function render(props: Props){
  return propsCheck(props) ? <AlbumBlurb {...props} /> : <p>{id} failed propsCheck</p>
}
