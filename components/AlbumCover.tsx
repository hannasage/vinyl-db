import React from 'react';
import Image from 'next/image';
import { FullAlbumDetails } from '@/data/types';

export const AlbumCoverContainer = ({ children, className }: React.PropsWithChildren<{className?: string}>) => (
  <section className={`relative ${className}`}>
    {children}
  </section>
)

const AlbumCover = ({ album, containerSize = 'full' }: { album: FullAlbumDetails, containerSize?: number | 'full' }) => {
  const hasArtwork = album.artwork_url && album.artwork_url.trim() !== '';

  return (
    <AlbumCoverContainer className={`w-${containerSize} h-${containerSize}`}>
      {hasArtwork ? (
        <Image 
          src={album.artwork_url} 
          alt={album.title} 
          width={999} 
          height={999} 
          className="aspect-square object-cover" 
        />
      ) : (
        <div className="w-full h-full aspect-square bg-gray-200 flex items-center justify-center border border-gray-300">
          <div className="text-center text-gray-500">
            <div className="text-2xl mb-2">🎵</div>
            <div className="text-sm font-medium">Coming Soon</div>
          </div>
        </div>
      )}
    </AlbumCoverContainer>
  )
}

export default AlbumCover