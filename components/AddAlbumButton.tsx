'use client';

import React from 'react';

interface AddAlbumButtonProps {
  onClick: () => void;
}

export default function AddAlbumButton({ onClick }: AddAlbumButtonProps) {
  return (
    <button
      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      onClick={onClick}
    >
      Add Album
    </button>
  );
} 