'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { fetchAlbumArtwork, getBestArtworkImage } from '@/utils/artwork';
import { AlbumArtworkImage } from '@/data/types';
import ArtworkSelector from './ArtworkSelector';

interface AlbumDetails {
  title: string;
  artist: string;
  releaseYear?: number;
  artworkUrl?: string;
}

interface AlbumConfirmationCardProps {
  album: AlbumDetails;
  action: 'add' | 'remove';
  onConfirm: (selectedArtworkUrl?: string) => void;
  onDeny: () => void;
  isLoading?: boolean;
  className?: string;
  enableArtworkSearch?: boolean;
}

export default function AlbumConfirmationCard({
  album,
  action,
  onConfirm,
  onDeny,
  isLoading = false,
  className = '',
  enableArtworkSearch = true
}: AlbumConfirmationCardProps) {
  const [artworkImages, setArtworkImages] = useState<AlbumArtworkImage[]>([]);
  const [isSearchingArtwork, setIsSearchingArtwork] = useState(false);
  const [showArtworkSelector, setShowArtworkSelector] = useState(false);
  const [selectedArtworkUrl, setSelectedArtworkUrl] = useState<string | undefined>(album.artworkUrl);
  const [artworkSearchError, setArtworkSearchError] = useState<string | null>(null);
  const hasSearchedRef = useRef(false);

  const isAdd = action === 'add';
  const actionText = isAdd ? 'Add to Collection' : 'Remove from Collection';
  const confirmText = isAdd ? 'Add Album' : 'Remove Album';
  const bgColor = isAdd ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  const textColor = isAdd ? 'text-green-800' : 'text-red-800';
  const buttonColor = isAdd ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600';

  // Auto-fetch artwork when component mounts (for add actions)
  useEffect(() => {
    if (isAdd && enableArtworkSearch && !album.artworkUrl && !hasSearchedRef.current) {
      hasSearchedRef.current = true;
      handleSearchArtwork();
    }
  }, [isAdd, enableArtworkSearch, album.artworkUrl]);

  const handleSearchArtwork = async () => {
    if (!isAdd) return; // Only search for add actions
    
    setIsSearchingArtwork(true);
    setArtworkSearchError(null);
    
    try {
      const result = await fetchAlbumArtwork({
        albumName: album.title,
        artistName: album.artist,
        releaseYear: album.releaseYear,
        maxResults: 6
      });
      
      if (result.success && result.images.length > 0) {
        setArtworkImages(result.images);
        // Auto-select the best quality image
        const bestImageUrl = getBestArtworkImage(result.images);
        if (bestImageUrl) {
          setSelectedArtworkUrl(bestImageUrl);
        }
      }
    } catch (error) {
      console.error('Error searching for artwork:', error);
      setArtworkSearchError('Failed to search for artwork');
    } finally {
      setIsSearchingArtwork(false);
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedArtworkUrl);
  };

  const handleArtworkSelect = (image: AlbumArtworkImage) => {
    setSelectedArtworkUrl(image.url);
    setShowArtworkSelector(false);
  };

  return (
    <div className={`${bgColor} border rounded-lg p-4 ${className}`}>
      <div className="flex items-center space-x-2 mb-3">
        <div className={`w-6 h-6 ${isAdd ? 'bg-green-100' : 'bg-red-100'} rounded-full flex items-center justify-center`}>
          <span className={`${isAdd ? 'text-green-600' : 'text-red-600'} text-sm font-bold`}>
            {isAdd ? '+' : '-'}
          </span>
        </div>
        <h3 className={`text-lg font-semibold ${textColor}`}>{actionText}</h3>
      </div>
      
      <div className="mb-4">
        <p className={`${textColor} mb-3`}>
          Please confirm the album details before {isAdd ? 'adding' : 'removing'} from your collection:
        </p>
        
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <div className="flex items-start space-x-3">
            {/* Album Details */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 text-lg truncate">
                {album.title}
              </h4>
              <p className="text-gray-600 mb-1">by {album.artist}</p>
              {album.releaseYear && (
                <p className="text-gray-500 text-sm">{album.releaseYear}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Artwork Selection Section */}
      {isAdd && enableArtworkSearch && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">Album Artwork</h4>
            {artworkImages.length > 0 && (
              <button
                onClick={() => setShowArtworkSelector(true)}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Choose Different Artwork
              </button>
            )}
          </div>
          
          <div className="bg-white rounded-lg p-3 border shadow-sm">
            <div className="flex items-center space-x-3">
              {/* Album Artwork */}
              <div className="flex-shrink-0">
                {isSearchingArtwork ? (
                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  </div>
                ) : selectedArtworkUrl ? (
                  <Image
                    src={selectedArtworkUrl}
                    alt={`${album.title} artwork`}
                    width={80}
                    height={80}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400 text-xs text-center">No Artwork</span>
                  </div>
                )}
              </div>
              
              {/* Artwork Status */}
              <div className="flex-1">
                {isSearchingArtwork && (
                  <p className="text-sm text-gray-600">Searching for artwork...</p>
                )}
                {artworkSearchError && (
                  <p className="text-sm text-red-600">{artworkSearchError}</p>
                )}
                {!isSearchingArtwork && !artworkSearchError && !selectedArtworkUrl && (
                  <button
                    onClick={handleSearchArtwork}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Search for Artwork
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={handleConfirm}
          disabled={isLoading || isSearchingArtwork}
          className={`flex-1 ${buttonColor} text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
            isAdd ? 'focus:ring-green-500' : 'focus:ring-red-500'
          }`}
        >
          {isLoading ? 'Processing...' : confirmText}
        </button>
        <button
          onClick={onDeny}
          disabled={isLoading || isSearchingArtwork}
          className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Artwork Selector Modal */}
      {showArtworkSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <ArtworkSelector
              images={artworkImages}
              onSelect={handleArtworkSelect}
              onCancel={() => setShowArtworkSelector(false)}
              albumName={album.title}
              artistName={album.artist}
            />
          </div>
        </div>
      )}
    </div>
  );
} 