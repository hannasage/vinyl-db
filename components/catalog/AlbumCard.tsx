'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { FullAlbumDetails } from '@/data/types';

interface AlbumCardProps {
  album: FullAlbumDetails;
}

export default function AlbumCard({ album }: AlbumCardProps) {
  const [flipped, setFlipped] = useState(false);
  const handleFlip = () => setFlipped((prev) => !prev);

  return (
    <div className="album-card cursor-pointer" onClick={handleFlip}>
      <div className={`relative transition-transform duration-500 [transform-style:preserve-3d] ${flipped ? '[transform:rotateY(180deg)]' : ''}`}
        style={{ minHeight: 0 }}>
        {/* Front */}
        <div className="album-artwork [backface-visibility:hidden]">
          {album.artwork_url ? (
            <Image
              src={album.artwork_url}
              alt={`${album.title} by ${album.artist_name}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-600 flex items-center justify-center">
              <span className="text-white/50 text-xs text-center px-2">
                {album.title}
              </span>
            </div>
          )}
        </div>
        {/* Back */}
        <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center bg-[#fafafa] [backface-visibility:hidden] [transform:rotateY(180deg)] p-4">
          <h3 className="album-title text-center">{album.title}</h3>
          <p className="album-artist text-center">{album.artist_name}</p>
          <p className="album-year text-center">{album.release_year}</p>
        </div>
      </div>
    </div>
  );
} 