'use client';

import React from 'react';
import Image from 'next/image';
import { AlbumPreviewData } from '../data/types';

interface AlbumPreviewProps {
  album: AlbumPreviewData;
  onConfirm: () => void;
  onReject: () => void;
  className?: string;
}

export default function AlbumPreview({ album, onConfirm, onReject, className = '' }: AlbumPreviewProps) {
  const getConfidenceColor = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceText = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return 'High Confidence';
      case 'medium':
        return 'Medium Confidence';
      case 'low':
        return 'Low Confidence';
      default:
        return 'Unknown Confidence';
    }
  };

  const hasImage = album.imageUrl && album.imageUrl.trim() !== '';

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm p-4 max-w-sm ${className}`}>
      {/* Album Artwork */}
      <div className="mb-4">
        {hasImage ? (
          <Image
            src={album.imageUrl!}
            alt={`${album.title} by ${album.artist}`}
            width={400}
            height={192}
            className="w-full h-48 object-cover rounded-lg shadow-sm"
          />
        ) : (
          <div className="w-full h-48 bg-gray-200 flex items-center justify-center rounded-lg shadow-sm border border-gray-300">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">🎵</div>
              <div className="text-sm font-medium">Coming Soon</div>
            </div>
          </div>
        )}
      </div>

      {/* Album Information */}
      <div className="space-y-2 mb-4">
        <h3 className="text-lg font-semibold text-gray-900 truncate" title={album.title}>
          {album.title}
        </h3>
        <p className="text-gray-600 truncate" title={album.artist}>
          by {album.artist}
        </p>
        {album.year && album.year !== 'Unknown' && (
          <p className="text-sm text-gray-500">
            Released {album.year}
          </p>
        )}
        
        {/* Confidence Badge */}
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getConfidenceColor(album.confidence)}`}>
            {getConfidenceText(album.confidence)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={onConfirm}
          disabled={album.isConfirmed || album.isRejected}
          className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {album.isConfirmed ? 'Confirmed' : 'Confirm'}
        </button>
        <button
          onClick={onReject}
          disabled={album.isConfirmed || album.isRejected}
          className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {album.isRejected ? 'Rejected' : 'Reject'}
        </button>
      </div>

      {/* Status Message */}
      {(album.isConfirmed || album.isRejected) && (
        <div className="mt-3 text-center">
          <p className={`text-sm ${album.isConfirmed ? 'text-green-600' : 'text-red-600'}`}>
            {album.isConfirmed ? 'Album confirmed for collection' : 'Album rejected'}
          </p>
        </div>
      )}
    </div>
  );
} 