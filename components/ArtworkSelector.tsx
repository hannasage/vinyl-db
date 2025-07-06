'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { AlbumArtworkImage } from '@/data/types';

interface ArtworkSelectorProps {
  images: AlbumArtworkImage[];
  onSelect: (image: AlbumArtworkImage) => void;
  onCancel: () => void;
  albumName: string;
  artistName: string;
  isLoading?: boolean;
  className?: string;
}

const getQualityColor = (quality: string) => {
  switch (quality) {
    case 'excellent':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'good':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'acceptable':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getQualityText = (quality: string) => {
  switch (quality) {
    case 'excellent':
      return 'Excellent';
    case 'good':
      return 'Good';
    case 'acceptable':
      return 'Acceptable';
    case 'low':
      return 'Low';
    default:
      return 'Unknown';
  }
};

export default function ArtworkSelector({
  images,
  onSelect,
  onCancel,
  albumName,
  artistName,
  isLoading = false,
  className = ''
}: ArtworkSelectorProps) {
  const [selectedImage, setSelectedImage] = useState<AlbumArtworkImage | null>(null);

  const handleImageSelect = (image: AlbumArtworkImage) => {
    setSelectedImage(image);
  };

  const handleConfirm = () => {
    if (selectedImage) {
      onSelect(selectedImage);
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg shadow-lg p-6 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Searching for album artwork...</p>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg shadow-lg p-6 ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-4">🎵</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Artwork Found</h3>
          <p className="text-gray-600 mb-4">
            We couldn&apos;t find any artwork for &quot;{albumName}&quot; by {artistName}.
          </p>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Continue Without Artwork
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-lg p-6 ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Album Artwork</h3>
        <p className="text-gray-600">
          Choose the best artwork for &quot;{albumName}&quot; by {artistName}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 max-h-96 overflow-y-auto">
        {images.map((image, index) => (
          <div
            key={index}
            className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
              selectedImage?.url === image.url
                ? 'border-blue-500 ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleImageSelect(image)}
          >
            {/* Image */}
            <div className="aspect-square relative">
              <Image
                src={image.url}
                alt={image.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>

            {/* Overlay with quality badge */}
            <div className="absolute top-2 right-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getQualityColor(image.estimatedQuality)}`}>
                {getQualityText(image.estimatedQuality)}
              </span>
            </div>

            {/* Selection indicator */}
            {selectedImage?.url === image.url && (
              <div className="absolute top-2 left-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}

            {/* Image info */}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-2 text-xs">
              <div className="truncate">{image.title}</div>
              <div className="text-gray-300">
                {image.width} × {image.height} • {image.source}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={!selectedImage}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Use Selected Artwork
        </button>
      </div>

      {/* Selected image preview */}
      {selectedImage && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Selected Artwork:</h4>
          <div className="flex items-center space-x-3">
            <div className="w-16 h-16 relative rounded-lg overflow-hidden">
              <Image
                src={selectedImage.url}
                alt={selectedImage.title}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{selectedImage.title}</p>
              <p className="text-xs text-gray-600">
                {selectedImage.width} × {selectedImage.height} • {selectedImage.source}
              </p>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border mt-1 ${getQualityColor(selectedImage.estimatedQuality)}`}>
                {getQualityText(selectedImage.estimatedQuality)} Quality
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 