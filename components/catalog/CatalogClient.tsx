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

  // const randomAlbums = useMemo(() => {
  //   if (initialAlbums.length <= 10) return initialAlbums;
    
    // Use stable random selection
  //   const seed = `${initialAlbums.length}-${initialAlbums[0]?.title || 'default'}`;
  //   return stableRandomSelect(initialAlbums, 10, seed);
  // }, [initialAlbums]);

  // const carouselItems: CarouselItem[] = useMemo(() => {
  //   return randomAlbums.map(album => ({
  //     id: album.id.toString(),
  //     src: album.artwork_url || '/default-album-cover.png',
  //     alt: `${album.title} by ${album.artist_name}`,
  //     title: album.title,
  //     artist: album.artist_name,
  //     year: album.release_year
  //   }));
  // }, [randomAlbums]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // const handleAlbumSelect = (item: CarouselItem, index: number) => {
  //   const album = randomAlbums[index];
  //   console.log('Selected album:', album);
  // };

  return (
    <>
      <CatalogNavigation
        onSearch={handleSearch}
      />
      
      {/* {carouselItems.length > 0 && (
        <div>
          <CoverFlowCarousel
            items={carouselItems}
            initialIndex={Math.floor(carouselItems.length / 2)}
            onItemSelect={handleAlbumSelect}
            className="h-[480px]"
            showTitle={true}
          />
        </div>
      )} */}
      
      <CatalogGrid
        albums={filteredAlbums}
        isLoading={false}
      />
    </>
  );
} 