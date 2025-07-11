'use client';

import React, { useState } from 'react';
import { Bot, X } from 'lucide-react';

interface FloatingChatButtonProps {
  onOpen: () => void;
  isVisible: boolean;
  isModalOpen?: boolean;
}

export default function FloatingChatButton({ onOpen, isVisible, isModalOpen = false }: FloatingChatButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Debug logging
  console.log('FloatingChatButton - isVisible:', isVisible, 'isModalOpen:', isModalOpen);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] pointer-events-auto">
              <button
          onClick={(e) => {
            console.log('Button clicked!');
            e.preventDefault();
            e.stopPropagation();
            onOpen();
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`
            flex items-center justify-center
            w-14 h-14 rounded-full
            ${isModalOpen 
              ? 'bg-gradient-to-r from-red-500 to-red-600' 
              : 'bg-gradient-to-r from-purple-600 to-blue-600'
            }
            text-white shadow-lg
            transition-all duration-300 ease-in-out
            hover:scale-110 hover:shadow-xl
            active:scale-95
            ${isHovered ? 'rotate-12' : 'rotate-0'}
          `}
          aria-label={isModalOpen ? "Close chat interface" : "Open chat interface"}
        >
          {isModalOpen ? (
            <X 
              size={24} 
              className={`transition-transform duration-300 ${isHovered ? 'scale-110' : 'scale-100'}`}
            />
          ) : (
            <Bot 
              size={24} 
              className={`transition-transform duration-300 ${isHovered ? 'scale-110' : 'scale-100'}`}
            />
          )}
        </button>
      
      {/* Pulse animation ring - only show when not in close mode */}
      {!isModalOpen && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 opacity-20 animate-ping pointer-events-none" />
      )}
    </div>
  );
} 