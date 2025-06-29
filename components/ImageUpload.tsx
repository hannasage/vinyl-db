'use client';

import React, { useRef } from 'react';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  onError: (message: string) => void;
  className?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export default function ImageUpload({ onImageSelect, onError, className = '' }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      onError('Please select a valid image file (JPG, PNG, or WebP)');
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      onError('File size must be less than 10MB');
      return false;
    }
    return true;
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (!validateFile(files[0])) return;
      onImageSelect(files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={handleButtonClick}
        className={`flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-blue-100 border border-gray-300 text-gray-500 hover:text-blue-600 transition-colors ${className}`}
        aria-label="Upload image"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 9l5-5 5 5M12 4v12" />
        </svg>
      </button>
    </>
  );
} 