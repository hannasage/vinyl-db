'use client';

import React from 'react';

interface AlbumActionProps {
  action: 'add' | 'remove';
  albumName: string;
  artistName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  className?: string;
}

export default function AlbumAction({ 
  action, 
  albumName, 
  artistName, 
  onConfirm, 
  onCancel, 
  isLoading = false,
  className = '' 
}: AlbumActionProps) {
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
        <p className={`${textColor} mb-2`}>
          Are you sure you want to {isAdd ? 'add' : 'remove'} this album?
        </p>
        <div className="bg-white rounded-lg p-3 border">
          <h4 className="font-semibold text-gray-900">{albumName}</h4>
          <p className="text-gray-600">by {artistName}</p>
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
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
} 