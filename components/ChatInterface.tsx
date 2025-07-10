'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import ChatMessage from './ChatMessage';
import ImageUpload from './ImageUpload';
import ConversationHistory from './ConversationHistory';
import ConversationFeedback from './ConversationFeedback';
import ExemplarManager from './ExemplarManager';
import { ChatMessageType, ChatResponse } from '../data/types';
import { createClient } from '../utils/supabase/client';
import { enhancedMemoryManager } from '../utils/agent/memory';
import { format } from 'date-fns';

interface ChatInterfaceProps {
  className?: string;
}

export default function ChatInterface({ className = '' }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [pendingConfirmations, setPendingConfirmations] = useState<Map<string, any>>(new Map());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessageType[]>([]);
  const [sessionDetails, setSessionDetails] = useState<{ createdAt: Date } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [currentFeedback, setCurrentFeedback] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const [showExemplarManager, setShowExemplarManager] = useState(false);

  // Initialize session and load conversation history
  // useEffect(() => {
  //   initializeSession();
  // }, []);

  // Update messages ref when messages change
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Clean up blob URLs when component unmounts
  useEffect(() => {
    return () => {
      // Clean up selected image blob URL only
      if (selectedImageUrl && selectedImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(selectedImageUrl);
      }
    };
  }, [selectedImageUrl]);

  const handleImageSelect = (file: File) => {
    // Clean up previous blob URL if it exists
    if (selectedImageUrl && selectedImageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(selectedImageUrl);
    }
    
    // Create new blob URL for preview
    const newBlobUrl = URL.createObjectURL(file);
    setSelectedImageUrl(newBlobUrl);
    setSelectedImage(file);
  };

  const handleImageError = (message: string) => {
    setError(message);
  };

  const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1]; // Remove data:image/jpeg;base64, prefix
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && !selectedImage) return;

    let imageData: string | undefined;
    let mimeType: string | undefined;
    const imageFile = selectedImage;

    // Convert image to base64 if present
    if (imageFile) {
      try {
        imageData = await fileToBase64(imageFile);
        mimeType = imageFile.type;
      } catch {
        console.error('Image conversion error:');
        setError('Failed to process image. Please try again.');
        return;
      }
    }

    // If no session, create one now
    let sessionId = currentSessionId;
    if (!sessionId) {
      try {
        sessionId = await enhancedMemoryManager.createSession();
        setCurrentSessionId(sessionId);
        // Trigger sidebar refresh with animation for new session
        setRefreshTrigger(prev => prev + 1);
      } catch {
        setError('Failed to create new conversation session');
        return;
      }
    }

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      content: inputValue.trim() || '',
      sender: 'user',
      timestamp: new Date(),
      type: imageFile ? 'image' : 'text',
      imageUrl: selectedImageUrl || undefined,
      imageFile: imageFile || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setSelectedImage(null);
    setSelectedImageUrl(null);
    enhancedMemoryManager.addShortTermMessage(userMessage);
    if (sessionId) {
      try {
        await enhancedMemoryManager.saveMessage(
          userMessage.content,
          'user',
          userMessage.type,
          { imageUrl: userMessage.imageUrl }
        );
      } catch {
        console.error('Error saving user message to database:');
      }
    }
    setIsLoading(true);

    try {
      const supabase = createClient();
      
      // Get conversation context from short-term memory
      const conversationContext = enhancedMemoryManager.getShortTermContext(10);
      
      const { data, error } = await supabase.functions.invoke('chat-response', {
        body: { 
          message: userMessage.content,
          conversationContext: conversationContext,
          hasImage: !!imageFile,
          imageData: imageData,
          mimeType: mimeType
        }
      });

      if (error) {
        throw error;
      }

      const response = data as ChatResponse;
      
      // Handle album confirmation responses
      if (response.type === 'album_confirmation' && response.data?.confirmations) {
        // Store pending confirmations
        const newConfirmations = new Map(pendingConfirmations);
        response.data.confirmations.forEach((confirmation: any) => {
          newConfirmations.set(confirmation.operationId, confirmation);
        });
        setPendingConfirmations(newConfirmations);
        
        // Create confirmation messages
        for (const confirmation of response.data.confirmations) {
          const confirmationMessage: ChatMessageType = {
            id: (Date.now() + Math.random()).toString(),
            content: response.message,
            sender: 'agent',
            timestamp: new Date(response.timestamp),
            type: 'album_confirmation',
            data: {
              album: confirmation.album,
              action: confirmation.action,
              operationId: confirmation.operationId,
              isLoading: false,
              isPending: true
            }
          };
          
          setMessages(prev => [...prev, confirmationMessage]);
          enhancedMemoryManager.addShortTermMessage(confirmationMessage);
          
          // Save agent message to database
          if (currentSessionId) {
            try {
              await enhancedMemoryManager.saveMessage(
                confirmationMessage.content,
                'agent',
                confirmationMessage.type,
                confirmationMessage.data
              );
            } catch {
              console.error('Error saving agent message to database:');
            }
          }
        }
      } else {
        // Handle regular responses
        const agentMessage: ChatMessageType = {
          id: (Date.now() + 1).toString(),
          content: response.message,
          sender: 'agent',
          timestamp: new Date(response.timestamp),
          type: response.type === 'collection_query' ? 'collection_status' : 'text',
          data: response.data
        };

        setMessages(prev => [...prev, agentMessage]);
        enhancedMemoryManager.addShortTermMessage(agentMessage);
        
        // Save agent message to database
        if (currentSessionId) {
          try {
            await enhancedMemoryManager.saveMessage(
              agentMessage.content,
              'agent',
              agentMessage.type,
              agentMessage.data
            );
          } catch {
            console.error('Error saving agent message to database:');
          }
        }
      }
    } catch (_error) {
      console.error('Error calling chat endpoint:', _error);
      
      // Show error message to user
      const errorMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        sender: 'agent',
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, errorMessage]);
      enhancedMemoryManager.addShortTermMessage(errorMessage);
      
      // Save error message to database
      if (currentSessionId) {
        try {
          await enhancedMemoryManager.saveMessage(
            errorMessage.content,
            'agent',
            'text',
            { error: true }
          );
        } catch {
          console.error('Error saving error message to database:');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRemoveImage = () => {
    if (selectedImageUrl && selectedImageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(selectedImageUrl);
    }
    setSelectedImageUrl(null);
    setSelectedImage(null);
  };

  const handleFeedbackSubmit = async (feedbackType: 'thumbs_up' | 'thumbs_down') => {
    if (!currentSessionId) return;

    try {
      setCurrentFeedback(feedbackType);
      
      // Show success message
      const feedbackMessage: ChatMessageType = {
        id: (Date.now() + Math.random()).toString(),
        content: `Thank you for your feedback! This conversation has been marked as ${feedbackType === 'thumbs_up' ? 'helpful' : 'not helpful'} and saved as an exemplar.`,
        sender: 'agent',
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, feedbackMessage]);
      enhancedMemoryManager.addShortTermMessage(feedbackMessage);
      
      // Save feedback message to database
      try {
        await enhancedMemoryManager.saveMessage(
          feedbackMessage.content,
          'agent',
          'text',
          { feedbackSubmitted: true, feedbackType }
        );
      } catch {
        console.error('Error saving feedback message to database:');
      }

    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('Failed to submit feedback. Please try again.');
    }
  };

  const handleAlbumConfirm = async (operationId: string, selectedArtworkUrl?: string) => {
    const confirmation = pendingConfirmations.get(operationId);
    if (!confirmation) {
      console.error('Confirmation not found for operation:', operationId);
      return;
    }

    try {
      const supabase = createClient();
      
      // Update the operation parameters with selected artwork if provided
      const updatedOperation = {
        ...confirmation.originalOperation,
        parameters: {
          ...confirmation.originalOperation.parameters,
          ...(selectedArtworkUrl && { artworkUrl: selectedArtworkUrl })
        }
      };
      
      // Send the confirmed operation directly to chat-response
      const { data, error } = await supabase.functions.invoke('chat-response', {
        body: {
          message: `Confirm ${confirmation.action} operation for ${confirmation.album.title} by ${confirmation.album.artist}`,
          conversationContext: enhancedMemoryManager.getShortTermContext(),
          confirmedOperation: updatedOperation
        }
      });

      if (error) {
        throw error;
      }

      // Add success message
      const successMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        content: data.message,
        sender: 'agent',
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, successMessage]);
      enhancedMemoryManager.addShortTermMessage(successMessage);
      
      // Save success message to database
      if (currentSessionId) {
        try {
          await enhancedMemoryManager.saveMessage(
            successMessage.content,
            'agent',
            'text',
            { operationConfirmed: true }
          );
        } catch {
          console.error('Error saving success message to database:');
        }
      }

      // Remove from pending confirmations
      setPendingConfirmations(prev => {
        const newMap = new Map(prev);
        newMap.delete(operationId);
        return newMap;
      });
      // Mark the confirmation message as not pending
      setMessages(prev => prev.map(msg =>
        msg.type === 'album_confirmation' && msg.data?.operationId === operationId
          ? { ...msg, data: { ...msg.data, isPending: false } }
          : msg
      ));

    } catch {
      console.error('Error executing confirmed operation:');
      
      const errorMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error while processing your confirmation. Please try again.',
        sender: 'agent',
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, errorMessage]);
      enhancedMemoryManager.addShortTermMessage(errorMessage);
      
      // Save error message to database
      if (currentSessionId) {
        try {
          await enhancedMemoryManager.saveMessage(
            errorMessage.content,
            'agent',
            'text',
            { error: true }
          );
        } catch {
          console.error('Error saving error message to database:');
        }
      }
    }
  };

  const handleAlbumDeny = async (operationId: string) => {
    // Add cancellation message
    const cancelMessage: ChatMessageType = {
      id: (Date.now() + 1).toString(),
      content: 'Operation cancelled.',
      sender: 'agent',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, cancelMessage]);
    enhancedMemoryManager.addShortTermMessage(cancelMessage);
    
    // Save cancellation message to database
    if (currentSessionId) {
      try {
        await enhancedMemoryManager.saveMessage(
          cancelMessage.content,
          'agent',
          'text',
          { operationCancelled: true }
        );
      } catch {
        console.error('Error saving cancellation message to database:');
      }
    }

    // Remove from pending confirmations
    setPendingConfirmations(prev => {
      const newMap = new Map(prev);
      newMap.delete(operationId);
      return newMap;
    });
    // Mark the confirmation message as not pending
    setMessages(prev => prev.map(msg =>
      msg.type === 'album_confirmation' && msg.data?.operationId === operationId
        ? { ...msg, data: { ...msg.data, isPending: false } }
        : msg
    ));
  };

  // Session management handlers
  const handleNewSession = async () => {
    try {
      // Create new session
      const sessionId = await enhancedMemoryManager.createSession();
      setCurrentSessionId(sessionId);
      
      // Clear current conversation
      setMessages([]);
      setPendingConfirmations(new Map());
      enhancedMemoryManager.clearShortTermMemory();
      setError(null);
      setCurrentFeedback(null);
      setShowExemplarManager(false);
      
      // Trigger sidebar refresh with animation
      setRefreshTrigger(prev => prev + 1);
    } catch {
      console.error('Error creating new session:');
      setError('Failed to create new conversation session');
    }
  };

  const handleSessionSelect = async (sessionId: string) => {
    try {
      // Load session into memory
      await enhancedMemoryManager.loadSessionIntoMemory(sessionId);
      setCurrentSessionId(sessionId);
      
      // Load messages from session
      const sessionMessages = await enhancedMemoryManager.getSessionMessages(sessionId);
      
      // Convert database messages to ChatMessageType format
      const chatMessages: ChatMessageType[] = sessionMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender,
        timestamp: msg.timestamp,
        type: msg.messageType as any,
        data: msg.metadata
      }));
      
      setMessages(chatMessages);
      setPendingConfirmations(new Map());
      setError(null);
      
      // Load current feedback for this session
      try {
        const feedback = await enhancedMemoryManager.getSessionFeedback(sessionId);
        setCurrentFeedback(feedback?.feedbackType || null);
      } catch {
        console.error('Error loading session feedback:');
        setCurrentFeedback(null);
      }
    } catch {
      console.error('Error loading session:');
      setError('Failed to load conversation session');
    }
  };

  // Reset refresh trigger after animation completes
  useEffect(() => {
    if (refreshTrigger > 0) {
      const timer = setTimeout(() => {
        setRefreshTrigger(0);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [refreshTrigger]);

  // Handle delete request from sidebar
  const handleDeleteRequest = (sessionId: string) => {
    setShowDeleteConfirm(sessionId);
  };



  const canSend = (inputValue.trim() || selectedImage) && !isLoading;

  // Responsive sidebar logic
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleResize = () => {
        if (window.innerWidth < 640) {
          setShowSidebar(false);
        } else {
          setShowSidebar(true);
        }
      };
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Fetch session details when currentSessionId changes
  useEffect(() => {
    if (currentSessionId) {
      enhancedMemoryManager.getSessionById(currentSessionId).then(session => {
        if (session) {
          setSessionDetails({ createdAt: session.createdAt });
        }
      });
    } else {
      setSessionDetails(null);
    }
  }, [currentSessionId]);



    // Handle session deletion
  const handleDeleteSession = async () => {
    if (!showDeleteConfirm) return;
    
    try {
      await enhancedMemoryManager.deleteSession(showDeleteConfirm);
      setShowDeleteConfirm(null);
      
      // If we deleted the current session, create a new one
      if (currentSessionId === showDeleteConfirm) {
        await handleNewSession();
      } else {
        // Refresh the sidebar to remove the deleted session
        setRefreshTrigger(prev => prev + 1);
      }
    } catch {
      setError('Failed to delete conversation');
    }
  };

  return (
    <div className={`relative flex h-screen w-full bg-white ${className}`}>
      {/* Sidebar for desktop, overlay for mobile */}
      {/* Backdrop for mobile */}
      <div
        className={[
          'fixed inset-0 z-40 bg-black',
          'transition-opacity duration-300 ease-in-out sm:hidden',
          showSidebar ? 'pointer-events-auto' : 'pointer-events-none'
        ].join(' ')}
        style={{ opacity: showSidebar ? 0.3 : 0 }}
        onClick={() => setShowSidebar(false)}
        aria-label="Close sidebar"
      />
      <div
        className={[
          'fixed top-0 left-0 h-full w-4/5 max-w-xs bg-white border-r border-gray-200 shadow-lg',
          'sm:static sm:w-80 sm:max-w-none sm:z-0 sm:shadow-none',
          'transition-all duration-300 ease-in-out',
          showSidebar ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0',
          'sm:translate-x-0 sm:opacity-100',
          'z-50 sm:z-0'
        ].join(' ')}
      >
        <div className="sm:hidden flex justify-end p-2">
          <button
            onClick={() => setShowSidebar(false)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            aria-label="Close sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <ConversationHistory
          onSessionSelect={handleSessionSelect}
          onNewSession={handleNewSession}
          onDeleteRequest={handleDeleteRequest}
          currentSessionId={currentSessionId}
          refreshTrigger={refreshTrigger}
          currentMessageCount={messages.length}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Header with editable title and timestamp */}
        <div className={`border-b border-gray-200 bg-white sticky top-0 z-30 transition-all duration-300 ease-in-out ${
          refreshTrigger > 0 ? 'bg-blue-50' : 'bg-white'
        }`}>
          <div className="flex flex-row items-center p-4 justify-between">
            <div className="flex items-center">
              {/* Sidebar open button for mobile */}
              <button
                onClick={() => setShowSidebar(true)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg sm:hidden"
                title="Show sidebar"
                aria-label="Show sidebar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {sessionDetails && (
                <span className="text-lg text-gray-700 ml-3 text-left m-0 p-0">
                  Created: {format(sessionDetails.createdAt, 'PPpp')}
                </span>
              )}
            </div>
            {/* Feedback and Exemplar UI in header */}
            {currentSessionId && messages.length > 0 && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">Was this conversation helpful?</span>
                <ConversationFeedback
                  sessionId={currentSessionId}
                  onFeedbackSubmit={handleFeedbackSubmit}
                  currentFeedback={currentFeedback}
                />
                <button
                  onClick={() => setShowExemplarManager(!showExemplarManager)}
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors border border-blue-100 rounded px-2 py-1 ml-2"
                >
                  {showExemplarManager ? 'Hide' : 'View'} Exemplars
                </button>
              </div>
            )}
          </div>
          {/* Exemplar Manager in header dropdown */}
          {showExemplarManager && (
            <div className="border-t border-gray-200 p-4 bg-white">
              <ExemplarManager />
            </div>
          )}
        </div>

        {/* SessionManager for mobile (below header) */}
        {/* Removed SessionManager info UI on mobile */}

        {/* Message List Area */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <p>Start a conversation by typing a message or uploading an image below</p>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                id={message.id}
                content={message.content}
                sender={message.sender}
                timestamp={message.timestamp}
                type={message.type}
                imageUrl={message.imageUrl}
                data={message.data}
                onAlbumConfirm={handleAlbumConfirm}
                onAlbumDeny={handleAlbumDeny}
              />
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm">Processing...</span>
                </div>
              </div>
            </div>
          )}
          {/* Scroll anchor for auto-scrolling */}
          <div ref={messagesEndRef} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="text-center text-red-500 mt-4">
            {error}
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-gray-200 p-2 sm:p-4 bg-white">
          <div className="flex items-center space-x-2">
            {/* Image Upload Icon Button */}
            <ImageUpload
              onImageSelect={handleImageSelect}
              onError={handleImageError}
              className=""
            />
            {/* If image selected, show thumbnail */}
            {selectedImageUrl && (
              <div className="relative mr-2">
                <Image
                  src={selectedImageUrl}
                  alt="Selected"
                  width={40}
                  height={40}
                  className="w-10 h-10 object-cover rounded-lg border border-gray-300"
                />
                <button
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 transition-colors text-xs"
                  type="button"
                  disabled={isLoading}
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
            )}
            {/* Text Input and Send Button */}
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!canSend || isLoading}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Conversation</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this conversation? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSession}
                className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 