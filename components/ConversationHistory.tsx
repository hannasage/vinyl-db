'use client';

import React, { useState, useEffect } from 'react';
import { enhancedMemoryManager, ConversationSession } from '../utils/agent/memory';
import { Plus, Search, Clock, MessageCircle, Trash2 } from 'lucide-react';

interface ConversationHistoryProps {
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteRequest?: (sessionId: string) => void;
  currentSessionId: string | null;
  refreshTrigger?: number;
  currentMessageCount?: number;
}

export default function ConversationHistory({
  onSessionSelect,
  onNewSession,
  onDeleteRequest,
  currentSessionId,
  refreshTrigger = 0,
  currentMessageCount = 0
}: ConversationHistoryProps) {
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<ConversationSession[]>([]);

  // Load recent sessions on component mount and when refreshTrigger changes
  useEffect(() => {
    loadRecentSessions();
  }, [refreshTrigger]);

  // Update message count in local state when it changes
  useEffect(() => {
    if (currentSessionId && currentMessageCount > 0) {
      // Find the current session in our list
      const currentSession = sessions.find(s => s.id === currentSessionId);
      if (currentSession && currentMessageCount !== currentSession.messageCount) {
        // Update the session in our local state
        setSessions(prev => prev.map(s => 
          s.id === currentSessionId 
            ? { ...s, messageCount: currentMessageCount }
            : s
        ));
      }
    }
  }, [currentMessageCount, currentSessionId, sessions]);

  const loadRecentSessions = async () => {
    try {
      setIsLoading(true);
      const recentSessions = await enhancedMemoryManager.getRecentSessions(20);
      setSessions(recentSessions);
    } catch (error) {
      console.error('Error loading recent sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const displaySessions = searchQuery.trim() ? searchResults : sessions;

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-full max-h-screen min-h-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between gap-2">
          {/* Search input left, plus button right */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Coming soon!"
              value={searchQuery}
              disabled
              readOnly
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed focus:ring-0 focus:border-gray-200 placeholder-gray-400"
            />
            <Search className="w-5 h-5 text-gray-300 absolute left-3 top-2.5" />
          </div>
          <button
            onClick={onNewSession}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors ml-2"
            title="New conversation"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2">Loading...</p>
          </div>
        ) : displaySessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery.trim() ? (
              <>
                <Search className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p>No conversations found</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="text-blue-500 hover:text-blue-600 mt-2"
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <MessageCircle className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p>No conversations yet</p>
                <button
                  onClick={onNewSession}
                  className="text-blue-500 hover:text-blue-600 mt-2"
                >
                  Start your first conversation
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="p-2">
            {displaySessions.map((session) => (
              <div
                key={session.id}
                className={`group relative p-3 rounded-lg cursor-pointer ${
                  currentSessionId === session.id
                    ? 'bg-blue-100 border border-blue-200'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => onSessionSelect(session.id)}
              >
                {/* Session Metadata */}
                <div className="flex items-center text-sm text-gray-500 space-x-3">
                  <div className="flex items-center">
                    <MessageCircle className="w-4 h-4 mr-1" />
                    <span>
                      {currentSessionId === session.id ? currentMessageCount : session.messageCount} messages
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>{session.createdAt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>

                {/* Active indicator */}
                {currentSessionId === session.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-lg"></div>
                )}

                {/* Delete button - show on hover for all sessions */}
                {onDeleteRequest && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteRequest(session.id);
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {searchQuery.trim() && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => {
              setSearchQuery('');
              setSearchResults([]);
            }}
            className="w-full text-sm text-gray-500 hover:text-gray-700"
          >
            Clear search and show all conversations
          </button>
        </div>
      )}
    </div>
  );
} 