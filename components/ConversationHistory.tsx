'use client';

import React, { useState, useEffect } from 'react';
import { enhancedMemoryManager, ConversationSession } from '../utils/agent/memory';

// Icons as inline SVG components
const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const MagnifyingGlassIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChatBubbleLeftRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const TrashIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsLoading(true);
      const results = await enhancedMemoryManager.searchSimilarConversations(searchQuery, 10);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const displaySessions = searchQuery.trim() ? searchResults : sessions;

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
          <button
            onClick={onNewSession}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="New conversation"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2">Loading...</p>
          </div>
        ) : displaySessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery.trim() ? (
              <>
                <MagnifyingGlassIcon className="w-12 h-12 mx-auto text-gray-300 mb-2" />
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
                <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto text-gray-300 mb-2" />
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
                    <ChatBubbleLeftRightIcon className="w-4 h-4 mr-1" />
                    <span>
                      {currentSessionId === session.id ? currentMessageCount : session.messageCount} messages
                    </span>
                  </div>
                  <div className="flex items-center">
                    <ClockIcon className="w-4 h-4 mr-1" />
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
                    <TrashIcon className="w-4 h-4" />
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