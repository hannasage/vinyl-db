'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import ChatInterface from './ChatInterface';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatModal({ isOpen, onClose }: ChatModalProps) {
  // Debug logging
  console.log('ChatModal - isOpen:', isOpen);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Chat Pane */}
      <div className="fixed bottom-24 right-4 z-50">
        <div className="
          relative w-96 h-[600px] max-h-[80vh]
          bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20
          animate-in slide-in-from-bottom-4 duration-300
          flex flex-col
        ">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200/50">
            <h2 className="text-lg font-semibold text-gray-900">
              Vinyl Assistant
            </h2>
            <button
              onClick={onClose}
              className="
                p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100/50
                transition-colors duration-200
              "
              aria-label="Close chat"
            >
              <X size={18} />
            </button>
          </div>
          
          {/* Chat Interface */}
          <div className="flex-1 overflow-hidden">
            <ChatInterface className="h-full" />
          </div>
        </div>
      </div>
    </>
  );
} 