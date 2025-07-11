'use client';

import React, { useEffect, useState } from 'react';
import { X, MoreVertical, Loader2 } from 'lucide-react';
import ChatInterface from './ChatInterface';
import { createClient } from '@/utils/supabase/client';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatModal({ isOpen, onClose }: ChatModalProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [embeddingStatus, setEmbeddingStatus] = useState<{
    albums: { total: number; withEmbeddings: number; withoutEmbeddings: number; complete: boolean };
    artists: { total: number; withEmbeddings: number; withoutEmbeddings: number; complete: boolean };
    overall: { complete: boolean };
  } | null>(null);
  const [isRunningBatch, setIsRunningBatch] = useState(false);

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

  // Check embedding status when modal opens
  useEffect(() => {
    if (isOpen) {
      checkEmbeddingStatus();
    }
  }, [isOpen]);

  const checkEmbeddingStatus = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('check-embedding-status');
      
      if (error) {
        console.error('Error checking embedding status:', error);
        return;
      }
      
      setEmbeddingStatus(data);
    } catch (error) {
      console.error('Error checking embedding status:', error);
    }
  };

  const runBatchEmbeddings = async () => {
    setIsRunningBatch(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('batch-embeddings', {
        body: { type: 'all', limit: 100 }
      });
      
      if (error) {
        console.error('Error running batch embeddings:', error);
        return;
      }
      
      console.log('Batch embeddings completed:', data);
      
      // Refresh status after completion
      await checkEmbeddingStatus();
    } catch (error) {
      console.error('Error running batch embeddings:', error);
    } finally {
      setIsRunningBatch(false);
      setShowMenu(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Chat Pane */}
      <div className="fixed bottom-24 inset-x-0 z-50 flex justify-center">
        <div className="
          relative w-full max-w-md max-w-full h-[80vh] max-h-screen overflow-y-auto
          bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-2xl rounded-lg shadow-2xl border border-white/20
          animate-in slide-in-from-bottom-4 duration-300
          flex flex-col
        ">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200/50">
            <h2 className="text-lg font-semibold text-gray-900">
              Vinyl Assistant
            </h2>
            <div className="flex items-center space-x-2">
              {/* 3-dot Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="
                    p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100/50
                    transition-colors duration-200
                  "
                  aria-label="More options"
                >
                  <MoreVertical size={18} />
                </button>
                
                {/* Dropdown Menu */}
                {showMenu && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-50"
                      onClick={() => setShowMenu(false)}
                    />
                    
                    {/* Menu */}
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="p-2">
                        <button
                          onClick={runBatchEmbeddings}
                          disabled={isRunningBatch}
                          className="
                            w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700
                            hover:bg-gray-100 rounded-md transition-colors duration-200
                            disabled:opacity-50 disabled:cursor-not-allowed
                          "
                        >
                          <span>Run Batch Embeddings</span>
                          {isRunningBatch ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <span className="text-xs text-gray-500">
                              {embeddingStatus?.albums.withoutEmbeddings || 0} pending
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {/* Close Button */}
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