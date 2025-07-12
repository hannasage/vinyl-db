'use client';

import React, { useState, useMemo } from 'react';
import { FullAlbumDetails } from '@/data/types';
import CatalogNavigation from './CatalogNavigation';
import CatalogGrid from './CatalogGrid';

interface CatalogClientProps {
  initialAlbums: FullAlbumDetails[];
}

export default function CatalogClient({ initialAlbums }: CatalogClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredAlbums = useMemo(() => {
    if (!searchQuery.trim()) return initialAlbums;
    return initialAlbums.filter(album => 
      album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      album.artist_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [initialAlbums, searchQuery]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <>
      <CatalogNavigation
        onSearch={handleSearch}
      />
      <CatalogGrid
        albums={filteredAlbums}
        isLoading={false}
      />
    </>
  );
} 