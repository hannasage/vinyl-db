'use client';

import React from 'react';
import { FullAlbumDetails } from '@/data/types';
import AlbumCard from './AlbumCard';

interface CatalogGridProps {
  albums: FullAlbumDetails[];
  isLoading?: boolean;
}

export default function CatalogGrid({ albums, isLoading = false }: CatalogGridProps) {
  if (isLoading) {
    return (
      <div className="album-grid">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (albums.length === 0) {
    return (
      <div className="album-grid">
        <div className="col-span-full text-center py-12">
          <div className="text-[#b19cd9] text-xl font-medium mb-2">No albums found</div>
          <p className="text-gray-400">Try adjusting your search or filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="album-grid">
      {albums.map((album) => (
        <AlbumCard key={album.id} album={album} />
      ))}
    </div>
  );
} 