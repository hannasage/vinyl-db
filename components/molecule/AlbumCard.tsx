import Image from 'next/image';
import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { FullAlbumDetails } from '@/data/types';

export type Props = { albumId: number, background: boolean, showArtist: boolean }

export const id = 'album-card'
export function propsCheck(p: Props) {
  return p && p.albumId
}

type GetAlbumRes = FullAlbumDetails

export async function AlbumCard({ albumId, background = true, showArtist = true }: Props) {
  const sb = createClient()
  const { data: album, error: albumError } = await sb.functions.invoke<GetAlbumRes>('get-album', {
    body: { albumId: albumId }
  });
  if (!album || albumError) redirect('/error')
  return (
    <div className={`flex flex-col mx-auto p-1 rounded-md ${background && "bg-gradient-to-br from-gray-700 to-gray-800"}`}>
      <Image
        src={album.artwork_url}
        alt={`album art for ${album.title} - ${album.artist_name}`}
        width={250}
        height={250}
        className={'rounded-md'}
      />
      <em className={'mt-3 ml-1 text-gray-200'}>{album.title}</em>
      {showArtist && <p className={'ml-1 text-gray-200'}>{album.artist_name}</p>}
      <em className={'ml-1 text-gray-400'}>{album.release_year}</em>
    </div>
  )
}

export function render(props: Props) {
  return propsCheck(props) ? <AlbumCard {...props} /> : <p>{id} failed propsCheck</p>
}
