import React from 'react';
import { FullAlbumDetails } from '@/data/types';
import { createClient } from '@/utils/supabase/server';
import { sortLegacyEntries } from '@/data/filters';
import CatalogClient from '@/components/catalog/CatalogClient';

export interface AlbumListRes {
  list: Array<FullAlbumDetails>
}

export default async function CatalogPage() {
  const sb = createClient();
  
  try {
    console.log('Fetching albums...');
    const { data, error } = await sb.functions.invoke<AlbumListRes>('get-album-list', {
      body: { list: "all" }
    });
    
    console.log('Response:', { data, error });
    
    if (error) {
      console.error('Supabase error:', error);
      return (
        <div className="catalog-layout">
          <div className="text-center py-12">
            <div className="text-[#b19cd9] text-xl font-medium mb-2">Error loading albums</div>
            <p className="text-gray-400">Please try refreshing the page</p>
          </div>
        </div>
      );
    }
    
    if (!data) {
      return (
        <div className="catalog-layout">
          <div className="text-center py-12">
            <div className="text-[#b19cd9] text-xl font-medium mb-2">No albums found</div>
            <p className="text-gray-400">No albums were returned from the server</p>
          </div>
        </div>
      );
    }
    
    console.log('Albums loaded:', data.list.length);
    const sortedAlbums = sortLegacyEntries(data.list, 'artist-alphabetical');
    
    return <CatalogClient initialAlbums={sortedAlbums} />;
    
  } catch (error) {
    console.error('Error fetching albums:', error);
    return (
      <div className="catalog-layout">
        <div className="text-center py-12">
          <div className="text-[#b19cd9] text-xl font-medium mb-2">Error loading albums</div>
          <p className="text-gray-400">Please try refreshing the page</p>
        </div>
      </div>
    );
  }
} 