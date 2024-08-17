import React from 'react';
import Image from 'next/image';
import Pill from '@/components/atom/Pill';
import { FullAlbumDetails } from '@/data/types';

const AlbumCover = ({ album }: { album: FullAlbumDetails }) => {
  const infoPosition = "absolute bottom-0 left-0 w-full"
  const infoInteraction = "group-hover:opacity-100 group-focus-within:opacity-100 group-active:opacity-100"
  const infoStyle = "h-full w-full flex flex-col gap-2 bg-black bg-opacity-50 text-white text-center p-4 flex justify-center items-center opacity-0 transition-opacity"
  return (
    <section className="relative w-52 h-52 group">
      <Image src={album.artwork_url} alt={album.title} height={999} width={999} className="aspect-square object-cover" />
      <div className={`${infoPosition} ${infoInteraction} ${infoStyle}`}>
        <Pill text={album.artist_name} />
        <p className="text-sm font-semibold">{album.title}</p>
      </div>
    </section>
  )
}

export default AlbumCover