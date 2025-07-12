'use client';

import { FullAlbumDetails } from '@/data/types';
import Image from 'next/image';

interface AlbumBackdropProps {
  albums: FullAlbumDetails[];
}

export default function AlbumBackdrop({ albums }: AlbumBackdropProps) {
  // Duplicate albums array to create seamless scrolling effect
  const duplicatedAlbums = [...albums, ...albums];

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Gradient overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-black/40 z-10" />
      
      {/* Scrolling album grid */}
      <div className="absolute inset-0 animate-scroll">
        <div className="grid grid-cols-12 grid-rows-8 md:grid-cols-10 md:grid-rows-10 lg:grid-cols-8 lg:grid-rows-12 gap-1 p-2 w-[200%]">
          {duplicatedAlbums.map((album, index) => (
            <div
              key={`${album.id}-${index}`}
              className="relative aspect-square rounded-lg overflow-hidden shadow-lg hover:scale-105 transition-transform duration-300"
            >
              {album.artwork_url ? (
                <Image
                  src={album.artwork_url}
                  alt={`${album.title} by ${album.artist_name}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                  priority={index < 12} // Prioritize first 12 images
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-600 flex items-center justify-center">
                  <span className="text-white/50 text-xs text-center px-2">
                    {album.title}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 