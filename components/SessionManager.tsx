'use client';

import React, { useState, useEffect } from 'react';
import { enhancedMemoryManager, ConversationSession, ConversationMessage } from '../utils/agent/memory';

// Icons as inline SVG components
const PencilIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

const ArchiveBoxIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
  </svg>
);

const ArrowDownTrayIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
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

interface SessionManagerProps {
  sessionId: string;
  onTitleChange: (sessionId: string, newTitle: string) => void;
  onArchive: (sessionId: string) => void;
}

export default function SessionManager({
  sessionId,
  onTitleChange,
  onArchive
}: SessionManagerProps) {
  const [session, setSession] = useState<ConversationSession | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (sessionId) {
      loadSessionData();
    }
  }, [sessionId]);

  const loadSessionData = async () => {
    try {
      setIsLoading(true);
      const [sessionData, messagesData] = await Promise.all([
        enhancedMemoryManager.getRecentSessions(1).then(sessions => 
          sessions.find(s => s.id === sessionId) || null
        ),
        enhancedMemoryManager.getSessionMessages(sessionId)
      ]);
      
      setSession(sessionData);
      setMessages(messagesData);
      setEditTitle(sessionData?.title || '');
    } catch (error) {
      console.error('Error loading session data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTitleSave = async () => {
    if (!session || !editTitle.trim()) return;

    try {
      await enhancedMemoryManager.updateSessionTitle(sessionId, editTitle.trim());
      setSession(prev => prev ? { ...prev, title: editTitle.trim() } : null);
      onTitleChange(sessionId, editTitle.trim());
      setIsEditingTitle(false);
    } catch (error) {
      console.error('Error updating session title:', error);
    }
  };

  const handleTitleCancel = () => {
    setEditTitle(session?.title || '');
    setIsEditingTitle(false);
  };

  const handleArchive = async () => {
    if (!session) return;

    try {
      await enhancedMemoryManager.archiveSession(sessionId);
      onArchive(sessionId);
    } catch (error) {
      console.error('Error archiving session:', error);
    }
  };

  const handleExport = () => {
    if (!session || !messages.length) return;

    const exportData = {
      session: {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messageCount: session.messageCount
      },
      messages: messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender,
        timestamp: msg.timestamp,
        sequenceNumber: msg.sequenceNumber
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title || 'conversation'}-${session.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDuration = (startDate: Date, endDate: Date) => {
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 border-b border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-4 border-b border-gray-200">
        <p className="text-gray-500">No session selected</p>
      </div>
    );
  }

  const sessionDuration = messages.length > 1 
    ? formatDuration(messages[0].timestamp, messages[messages.length - 1].timestamp)
    : '0m';

  return (
    <div className="p-4 border-b border-gray-200 bg-white">
      {/* Session Title */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          {isEditingTitle ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleTitleSave()}
                onBlur={handleTitleSave}
                className="flex-1 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <button
                onClick={handleTitleSave}
                className="px-2 py-1 text-sm text-green-600 hover:text-green-700"
              >
                Save
              </button>
              <button
                onClick={handleTitleCancel}
                className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-semibold text-gray-900 truncate">
                {session.title || 'Untitled Conversation'}
              </h2>
              <button
                onClick={() => setIsEditingTitle(true)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Edit title"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Session Statistics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <ChatBubbleLeftRightIcon className="w-4 h-4" />
          <span>{session.messageCount} messages</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <ClockIcon className="w-4 h-4" />
          <span>{sessionDuration}</span>
        </div>
      </div>

      {/* Session Metadata */}
      <div className="text-xs text-gray-500 mb-4">
        <div>Created: {formatDate(session.createdAt)}</div>
        <div>Last updated: {formatDate(session.updatedAt)}</div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={handleExport}
          className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Export conversation"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          <span>Export</span>
        </button>
        <button
          onClick={handleArchive}
          className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Archive conversation"
        >
          <ArchiveBoxIcon className="w-4 h-4" />
          <span>Archive</span>
        </button>
      </div>
    </div>
  );
} 