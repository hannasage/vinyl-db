'use client';

import React, { useState, useEffect } from 'react';
import { enhancedMemoryManager } from '../utils/agent/memory';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface ConversationFeedbackProps {
  sessionId: string;
  onFeedbackSubmit?: (feedbackType: 'thumbs_up' | 'thumbs_down' | null) => void;
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
      // If clicking the same button, remove the feedback
      if (feedback === feedbackType) {
        await enhancedMemoryManager.removeFeedback(sessionId);
        setFeedback(null);
        onFeedbackSubmit?.(null);
      } else {
        // Otherwise, save/update the feedback
        await enhancedMemoryManager.saveFeedback(sessionId, feedbackType);
        setFeedback(feedbackType);
        onFeedbackSubmit?.(feedbackType);
      }

    } catch (err) {
      console.error('Error saving feedback:', err);
      setError('Failed to save feedback. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleFeedback('thumbs_up')}
        className={`p-2 rounded-full border transition-colors ${
          feedback === 'thumbs_up' 
            ? 'bg-green-100 border-green-400 text-green-600' 
            : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-green-500'
        }`}
        aria-label={feedback === 'thumbs_up' ? 'Remove helpful rating' : 'Mark conversation as helpful'}
        disabled={isLoading}
      >
        <ThumbsUp className="w-5 h-5" />
      </button>
      <button
        onClick={() => handleFeedback('thumbs_down')}
        className={`p-2 rounded-full border transition-colors ${
          feedback === 'thumbs_down' 
            ? 'bg-red-100 border-red-400 text-red-600' 
            : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-red-500'
        }`}
        aria-label={feedback === 'thumbs_down' ? 'Remove not helpful rating' : 'Mark conversation as not helpful'}
        disabled={isLoading}
      >
        <ThumbsDown className="w-5 h-5" />
      </button>
      {error && (
        <span className="text-sm text-red-500">{error}</span>
      )}
    </div>
  );
} 