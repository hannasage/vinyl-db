'use client';

import React, { useState, useEffect } from 'react';
import { enhancedMemoryManager } from '../utils/agent/memory';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface ConversationFeedbackProps {
  sessionId: string;
  onFeedbackSubmit?: (feedbackType: 'thumbs_up' | 'thumbs_down') => void;
  currentFeedback?: 'thumbs_up' | 'thumbs_down' | null;
  className?: string;
}

export default function ConversationFeedback({
  sessionId,
  onFeedbackSubmit,
  currentFeedback,
  className = ''
}: ConversationFeedbackProps) {
  const [feedback, setFeedback] = useState<'thumbs_up' | 'thumbs_down' | null>(currentFeedback || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentFeedback !== undefined) {
      setFeedback(currentFeedback);
    }
  }, [currentFeedback]);

  const handleFeedback = async (feedbackType: 'thumbs_up' | 'thumbs_down') => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // Use the memory manager to save feedback
      await enhancedMemoryManager.saveFeedback(sessionId, feedbackType);
      
      setFeedback(feedbackType);
      onFeedbackSubmit?.(feedbackType);

    } catch (err) {
      console.error('Error saving feedback:', err);
      setError('Failed to save feedback. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFeedback = async () => {
    if (!feedback) return;
    
    const newFeedback = feedback === 'thumbs_up' ? 'thumbs_down' : 'thumbs_up';
    await handleFeedback(newFeedback);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        <button
          onClick={() => feedback === 'thumbs_up' ? handleToggleFeedback() : handleFeedback('thumbs_up')}
          disabled={isLoading}
          className={`
            p-2 rounded-lg transition-all duration-200 flex items-center gap-1
            ${feedback === 'thumbs_up' 
              ? 'bg-green-100 text-green-700 border-2 border-green-300 hover:bg-green-200' 
              : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200 hover:text-gray-800'
            }
            ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          title={feedback === 'thumbs_up' ? 'Remove positive feedback' : 'Mark as helpful conversation'}
        >
          <ThumbsUp className="w-4 h-4" />
          <span className="text-sm font-medium">Helpful</span>
        </button>

        <button
          onClick={() => feedback === 'thumbs_down' ? handleToggleFeedback() : handleFeedback('thumbs_down')}
          disabled={isLoading}
          className={`
            p-2 rounded-lg transition-all duration-200 flex items-center gap-1
            ${feedback === 'thumbs_down' 
              ? 'bg-red-100 text-red-700 border-2 border-red-300 hover:bg-red-200' 
              : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200 hover:text-gray-800'
            }
            ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          title={feedback === 'thumbs_down' ? 'Remove negative feedback' : 'Mark as unhelpful conversation'}
        >
          <ThumbsDown className="w-4 h-4" />
          <span className="text-sm font-medium">Not Helpful</span>
        </button>
      </div>

      {error && (
        <div className="text-red-600 text-sm">
          {error}
        </div>
      )}
    </div>
  );
} 