'use client';

import React from 'react';
import Image from 'next/image';

interface Album {
  id: number;
  title: string;
  artist_name: string;
  variant?: string;
  purchase_date?: string;
  acquired_date?: string;
  preordered?: boolean;
  artwork_url?: string;
  release_year?: number;
  size?: number;
}

interface CollectionStatusProps {
  found: boolean;
  albums?: Album[];
  albumName?: string;
  artistName?: string;
  message?: string;
  className?: string;
}

export default function CollectionStatus({ 
  found, 
  albums = [], 
  albumName, 
  artistName, 
  message,
  className = '' 
}: CollectionStatusProps) {
  if (!found) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-red-600 text-sm font-bold">✕</span>
          </div>
          <h3 className="text-lg font-semibold text-red-800">Not in Collection</h3>
        </div>
        <p className="text-red-700 mb-2">
          {message || `&quot;${albumName}&quot; by ${artistName} is not in your collection.`}
        </p>
        <div className="text-sm text-red-600">
          💡 Try checking the spelling or try a different search term.
        </div>
      </div>
    );
  }

  if (albums.length === 1) {
    const album = albums[0];
    const hasArtwork = album.artwork_url && album.artwork_url.trim() !== '';
    
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-green-600 text-sm font-bold">✓</span>
          </div>
          <h3 className="text-lg font-semibold text-green-800">In Collection</h3>
        </div>
        
        <div className="flex space-x-4">
          {/* Album Artwork */}
          <div className="flex-shrink-0">
            {hasArtwork ? (
              <Image
                src={album.artwork_url!}
                alt={`${album.title} by ${album.artist_name}`}
                width={64}
                height={64}
                className="w-16 h-16 object-cover rounded-lg shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-200 flex items-center justify-center rounded-lg shadow-sm border border-gray-300">
                <div className="text-center text-gray-500">
                  <div className="text-lg">🎵</div>
                </div>
              </div>
            )}
          </div>
          
          {/* Album Details */}
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">{album.title}</h4>
            <p className="text-gray-600">{album.artist_name}</p>
            
            <div className="mt-2 space-y-1 text-sm text-gray-600">
              {album.release_year && (
                <p>Released: {album.release_year}</p>
              )}
              {album.variant && (
                <p>Variant: {album.variant}</p>
              )}
              {album.size && (
                <p>Size: {album.size}&quot;</p>
              )}
              {album.purchase_date && (
                <p>Purchased: {new Date(album.purchase_date).toLocaleDateString()}</p>
              )}
              {album.acquired_date && album.acquired_date !== album.purchase_date && (
                <p>Acquired: {new Date(album.acquired_date).toLocaleDateString()}</p>
              )}
              {album.preordered && (
                <p className="text-blue-600 font-medium">🔄 Preordered</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Multiple albums found
  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center space-x-2 mb-3">
        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-blue-600 text-sm font-bold">!</span>
        </div>
        <h3 className="text-lg font-semibold text-blue-800">Multiple Albums Found</h3>
      </div>
      
      <p className="text-blue-700 mb-3">
        {message || `Found ${albums.length} albums matching &quot;${albumName}&quot; by ${artistName}:`}
      </p>
      
      <div className="space-y-3">
        {albums.map((album) => {
          const hasArtwork = album.artwork_url && album.artwork_url.trim() !== '';
          
          return (
            <div key={album.id} className="flex space-x-3 p-3 bg-white rounded-lg border border-blue-100">
              {/* Album Artwork */}
              <div className="flex-shrink-0">
                {hasArtwork ? (
                  <Image
                    src={album.artwork_url!}
                    alt={`${album.title} by ${album.artist_name}`}
                    width={48}
                    height={48}
                    className="w-12 h-12 object-cover rounded shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 flex items-center justify-center rounded shadow-sm border border-gray-300">
                    <div className="text-center text-gray-500">
                      <div className="text-sm">🎵</div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Album Details */}
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{album.title}</h4>
                <p className="text-sm text-gray-600">{album.artist_name}</p>
                
                <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                  {album.release_year && (
                    <p>Released: {album.release_year}</p>
                  )}
                  {album.variant && (
                    <p>Variant: {album.variant}</p>
                  )}
                  {album.purchase_date && (
                    <p>Purchased: {new Date(album.purchase_date).toLocaleDateString()}</p>
                  )}
                  {album.preordered && (
                    <p className="text-blue-600 font-medium">🔄 Preordered</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 