'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import ChatMessage from './ChatMessage';
import ImageUpload from './ImageUpload';
import ConversationHistory from './ConversationHistory';
import SessionManager from './SessionManager';
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
  const [error, setError] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [pendingConfirmations, setPendingConfirmations] = useState<Map<string, any>>(new Map());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessageType[]>([]);
  const [sessionDetails, setSessionDetails] = useState<{ title: string; createdAt: Date } | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');

  // Initialize session and load conversation history
  // useEffect(() => {
  //   initializeSession();
  // }, []);

  const initializeSession = async () => {
    try {
      // Create a new session
      const sessionId = await enhancedMemoryManager.createSession();
      setCurrentSessionId(sessionId);
      
      // Clear short-term memory for fresh start
      enhancedMemoryManager.clearShortTermMemory();
    } catch (error) {
      console.error('Error initializing session:', error);
      setError('Failed to initialize conversation session');
    }
  };

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
    setError(null);
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
      } catch (error) {
        console.error('Image conversion error:', error);
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
      } catch (error) {
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
      } catch (error) {
        console.error('Error saving user message to database:', error);
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
            } catch (error) {
              console.error('Error saving agent message to database:', error);
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
          } catch (error) {
            console.error('Error saving agent message to database:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error calling chat endpoint:', error);
      
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
        } catch (error) {
          console.error('Error saving error message to database:', error);
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
        } catch (error) {
          console.error('Error saving success message to database:', error);
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

    } catch (error) {
      console.error('Error executing confirmed operation:', error);
      
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
        } catch (error) {
          console.error('Error saving error message to database:', error);
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
      } catch (error) {
        console.error('Error saving cancellation message to database:', error);
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
    } catch (error) {
      console.error('Error creating new session:', error);
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
    } catch (error) {
      console.error('Error loading session:', error);
      setError('Failed to load conversation session');
    }
  };

  const handleSessionTitleChange = (sessionId: string, newTitle: string) => {
    // Update the session title in the UI if it's the current session
    if (sessionId === currentSessionId) {
      // The SessionManager component will handle the database update
      // We just need to refresh the conversation history if needed
    }
  };

  const handleSessionArchive = async (sessionId: string) => {
    // If the archived session is the current one, create a new session
    if (sessionId === currentSessionId) {
      await handleNewSession();
    }
  };

  const canSend = (inputValue.trim() || selectedImage) && !isLoading;

  // Responsive sidebar logic
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  // Hide sidebar by default on mobile
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
          setSessionDetails({ title: session.title || 'Untitled Conversation', createdAt: session.createdAt });
          setEditTitle(session.title || 'Untitled Conversation');
        }
      });
    } else {
      setSessionDetails(null);
      setEditTitle('');
    }
  }, [currentSessionId]);

  // Handle title edit
  const handleTitleSave = async () => {
    if (!currentSessionId) return;
    const newTitle = editTitle.trim() || 'Untitled Conversation';
    setSessionDetails(prev => prev ? { ...prev, title: newTitle } : prev);
    setIsEditingTitle(false);
    try {
      await enhancedMemoryManager.updateSessionTitle(currentSessionId, newTitle);
    } catch (error) {
      setError('Failed to update session title');
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
          'transition-transform duration-300 ease-in-out',
          showSidebar ? 'translate-x-0' : '-translate-x-full',
          'sm:translate-x-0',
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
          currentSessionId={currentSessionId}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header with editable title and timestamp */}
        <div className="border-b border-gray-200 bg-white sticky top-0 z-30">
          <div className="flex flex-col p-4">
            <div className="flex items-center space-x-4">
              {/* Menu button for mobile */}
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
              {isEditingTitle ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={e => { if (e.key === 'Enter') handleTitleSave(); }}
                  className="text-xl font-semibold text-gray-900 truncate bg-white border-b border-blue-400 focus:outline-none px-2 py-1 min-w-[120px]"
                  autoFocus
                />
              ) : (
                <h1
                  className="text-xl font-semibold text-gray-900 truncate cursor-pointer hover:underline"
                  onClick={() => setIsEditingTitle(true)}
                  title="Click to edit title"
                >
                  {sessionDetails?.title || 'Vinyl Collection Assistant'}
                </h1>
              )}
            </div>
            {sessionDetails && (
              <span className="text-xs text-gray-500 mt-1 ml-2">
                Created: {format(sessionDetails.createdAt, 'PPpp')}
              </span>
            )}
          </div>
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
          <div className="px-4 py-2 bg-red-100 border border-red-300 text-red-700 rounded-lg mx-4 mb-2">
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
    </div>
  );
} 