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

const ArchiveBoxIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
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

interface ConversationHistoryProps {
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  currentSessionId: string | null;
}

export default function ConversationHistory({
  onSessionSelect,
  onNewSession,
  currentSessionId
}: ConversationHistoryProps) {
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<ConversationSession[]>([]);

  // Load recent sessions on component mount
  useEffect(() => {
    loadRecentSessions();
  }, []);

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

  const handleArchiveSession = async (sessionId: string) => {
    try {
      await enhancedMemoryManager.archiveSession(sessionId);
      // Reload sessions to reflect the change
      await loadRecentSessions();
      // Clear search results if the archived session was in them
      setSearchResults(prev => prev.filter(session => session.id !== sessionId));
    } catch (error) {
      console.error('Error archiving session:', error);
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
                className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                  currentSessionId === session.id
                    ? 'bg-blue-100 border border-blue-200'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => onSessionSelect(session.id)}
              >
                {/* Session Title */}
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-medium text-gray-900 truncate flex-1">
                    {session.title || 'Untitled Conversation'}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArchiveSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition-opacity"
                    title="Archive conversation"
                  >
                    <ArchiveBoxIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Session Metadata */}
                <div className="flex items-center text-sm text-gray-500 mt-1 space-x-3">
                  <div className="flex items-center">
                    <ChatBubbleLeftRightIcon className="w-4 h-4 mr-1" />
                    <span>{session.messageCount} messages</span>
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