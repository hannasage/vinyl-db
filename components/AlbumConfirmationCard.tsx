'use client';

import React from 'react';
import Image from 'next/image';

interface AlbumDetails {
  title: string;
  artist: string;
  releaseYear?: number;
  artworkUrl?: string;
}

interface AlbumConfirmationCardProps {
  album: AlbumDetails;
  action: 'add' | 'remove';
  onConfirm: () => void;
  onDeny: () => void;
  isLoading?: boolean;
  className?: string;
}

export default function AlbumConfirmationCard({
  album,
  action,
  onConfirm,
  onDeny,
  isLoading = false,
  className = ''
}: AlbumConfirmationCardProps) {
  const isAdd = action === 'add';
  const actionText = isAdd ? 'Add to Collection' : 'Remove from Collection';
  const confirmText = isAdd ? 'Add Album' : 'Remove Album';
  const bgColor = isAdd ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  const textColor = isAdd ? 'text-green-800' : 'text-red-800';
  const buttonColor = isAdd ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600';

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
            {/* Album Artwork */}
            <div className="flex-shrink-0">
              {album.artworkUrl ? (
                <Image
                  src={album.artworkUrl}
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

      <div className="flex space-x-2">
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`flex-1 ${buttonColor} text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
            isAdd ? 'focus:ring-green-500' : 'focus:ring-red-500'
          }`}
        >
          {isLoading ? 'Processing...' : confirmText}
        </button>
        <button
          onClick={onDeny}
          disabled={isLoading}
          className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
} 