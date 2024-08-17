import React from 'react';
import Image from 'next/image';
import Pill from '@/components/atom/Pill';
import { FullAlbumDetails } from '@/data/types';
export const AlbumCoverContainer = ({ children, className }: React.PropsWithChildren<{className?: string}>) => (
  <section className={`relative min-w-52 min-h-52 group ${className}`}>
    {children}
  </section>
)
  const AlbumCover = ({album}: {album: FullAlbumDetails}) => {
    const infoPosition = 'absolute bottom-0 left-0 w-full'
    const infoInteraction = 'group-hover:opacity-100 group-focus-within:opacity-100 group-active:opacity-100'
    const infoStyle = 'h-full w-full flex flex-col gap-2 bg-black bg-opacity-50 text-white text-center p-4 flex justify-center items-center opacity-0 transition-opacity'
    return (
      <AlbumCoverContainer>
      <Image src={album.artwork_url} alt={album.title} width={999} height={999} className="aspect-square object-cover" />
        <div className={`${infoPosition} ${infoInteraction} ${infoStyle}`}>
          <Pill text={album.artist_name} />
          <p className="text-sm font-semibold">{album.title}</p>
        </div>
      </AlbumCoverContainer>
  )
}

export default AlbumCover