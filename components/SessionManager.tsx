'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { enhancedMemoryManager, ConversationSession, ConversationMessage } from '../utils/agent/memory';
import { Pencil, Archive, Download, Clock, MessageCircle } from 'lucide-react';

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

  const loadSessionData = useCallback(async () => {
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
    } catch (_error) {
      console.error('Error loading session data:', _error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      loadSessionData();
    }
  }, [sessionId, loadSessionData]);

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
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Session Statistics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <MessageCircle className="w-4 h-4" />
          <span>{session.messageCount} messages</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
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
          <Download className="w-4 h-4" />
          <span>Export</span>
        </button>
        <button
          onClick={handleArchive}
          className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Archive conversation"
        >
          <Archive className="w-4 h-4" />
          <span>Archive</span>
        </button>
      </div>
    </div>
  );
} 