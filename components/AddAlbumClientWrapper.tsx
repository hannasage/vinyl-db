'use client';

import React, { useState } from 'react';
import AddAlbumButton from './AddAlbumButton';
import AddAlbumPanel from './AddAlbumPanel';
import ContentGrid from './ContentGrid';
import { FullAlbumDetails } from '@/data/types';
import { FilterSortBar } from '@/components/FilterSortBar';

interface AddAlbumClientWrapperProps {
  albums: FullAlbumDetails[];
}

export default function AddAlbumClientWrapper({ albums: initialAlbums }: AddAlbumClientWrapperProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [albums, setAlbums] = useState<FullAlbumDetails[]>(initialAlbums);

  const handleAlbumAdded = (newAlbum: FullAlbumDetails) => {
    setAlbums(prev => [...prev, newAlbum]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Your Collection</h2>
          <p className="text-sm text-gray-500 mt-1">
            {albums.length} albums in your collection
          </p>
        </div>
        <AddAlbumButton onClick={() => setIsPanelOpen(true)} />
      </div>

      <FilterSortBar />
      <div className="bg-white rounded-lg shadow">
        <ContentGrid data={albums} />
      </div>
      <AddAlbumPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        onAlbumAdded={handleAlbumAdded}
      />
    </div>
  );
} 