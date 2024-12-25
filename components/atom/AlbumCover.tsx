import React from 'react';
import Image from 'next/image';
import { FullAlbumDetails } from '@/data/types';
export const AlbumCoverContainer = ({ children, className }: React.PropsWithChildren<{className?: string}>) => (
  <section className={`relative ${className}`}>
    {children}
  </section>
)
const AlbumCover = ({ album, containerSize = 'full' }: { album: FullAlbumDetails, containerSize?: number | 'full' }) => {
  return (
    <AlbumCoverContainer className={`w-${containerSize} h-${containerSize}`}>
      <Image src={album.artwork_url} alt={album.title} width={999} height={999} className="aspect-square object-cover" />
    </AlbumCoverContainer>
  )
}

 export default AlbumCover