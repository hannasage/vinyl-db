import { FullAlbumDetails } from '@/data/types';
import Image from 'next/image';
import React from 'react';

export type Props =
  Pick<FullAlbumDetails, "artwork_url" | "artist_name" | "title" | "release_year">
  & { background: boolean, showArtist: boolean }

export const id = 'album-card'
export function propsCheck(p: Props) {
  return !!p.artwork_url && !!p.title && p.artist_name && p.release_year && p.background && p.showArtist
}

export function AlbumCard(props: Props) {
  return (
    <div className={`flex flex-col mx-auto p-1 rounded-md ${props.background && "bg-gradient-to-br from-gray-700 to-gray-800"}`}>
      <Image
        src={props.artwork_url}
        alt={`album art for ${props.title} - ${props.artist_name}`}
        width={250}
        height={250}
        className={'rounded-md'}
      />
      <em className={'mt-3 ml-1 text-gray-200'}>{props.title}</em>
      {props.showArtist && <p className={'ml-1 text-gray-200'}>{props.artist_name}</p>}
      <em className={'ml-1 text-gray-400'}>{props.release_year}</em>
    </div>
  )
}

export function render(props: Props) {
  return propsCheck(props) ? <AlbumCard {...props} /> : <p>{id} failed propsCheck</p>
}
