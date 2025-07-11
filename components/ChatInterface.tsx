'use client';

import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import { ChatMessageType, ChatResponse } from '../data/types';
import { createClient } from '../utils/supabase/client';
import { memoryManager } from '../utils/agent/memory';

interface ChatInterfaceProps {
  className?: string;
}

export default function ChatInterface({ className = '' }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingConfirmations, setPendingConfirmations] = useState<Map<string, any>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessageType[]>([]);

  // Clear memory when component mounts (start fresh)
  useEffect(() => {
    memoryManager.clearMessages();
    
    // Cleanup blob URLs when component unmounts
    return () => {
      messagesRef.current.forEach((message: ChatMessageType) => {
        if (message.imageUrl && message.imageUrl.startsWith('blob:')) {
          URL.revokeObjectURL(message.imageUrl);
        }
      });
    };
  }, []);

  // Update messages ref when messages change
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);





  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    
    // Add user message to short-term memory
    memoryManager.addMessage(userMessage);
    
    setIsLoading(true);

    try {
      const supabase = createClient();
      
      // Get conversation context from short-term memory with current query for relevance scoring
      const conversationContext = memoryManager.getConversationContext(10, userMessage.content);
      
      const { data, error } = await supabase.functions.invoke('chat-response', {
        body: { 
          message: userMessage.content,
          conversationContext: conversationContext
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
        response.data.confirmations.forEach((confirmation: any) => {
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
              isLoading: false
            }
          };
          
          setMessages(prev => [...prev, confirmationMessage]);
          memoryManager.addMessage(confirmationMessage);
        });
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
        memoryManager.addMessage(agentMessage);
      }
    } catch (error) {
      console.error('Error calling chat endpoint:', error);
      
      // Show error message to user
      const errorMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        sender: 'agent',
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, errorMessage]);
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
          conversationContext: memoryManager.getConversationContext(),
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
      memoryManager.addMessage(successMessage);

      // Remove from pending confirmations
      setPendingConfirmations(prev => {
        const newMap = new Map(prev);
        newMap.delete(operationId);
        return newMap;
      });

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
    }
  };

  const handleAlbumDeny = (operationId: string) => {
    // Add cancellation message
    const cancelMessage: ChatMessageType = {
      id: (Date.now() + 1).toString(),
      content: 'Operation cancelled.',
      sender: 'agent',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, cancelMessage]);
    memoryManager.addMessage(cancelMessage);

    // Remove from pending confirmations
    setPendingConfirmations(prev => {
      const newMap = new Map(prev);
      newMap.delete(operationId);
      return newMap;
    });
  };

  const canSend = inputValue.trim() && !isLoading;

  return (
    <div className={`flex flex-col h-full w-full bg-transparent ${className}`}>
      {/* Header - only show if not in modal */}
      {!className.includes('h-full') && (
        <div className="border-b border-gray-200 p-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-xl font-semibold text-gray-900">Vinyl Collection Assistant</h1>
          </div>
        </div>
      )}

      {/* Message List Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 w-full">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>Start a conversation by typing a message below</p>
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
      {/* The error state variable was removed, so this block is no longer needed. */}
      {/* {error && (
        <div className="px-4 py-2 bg-red-100 border border-red-300 text-red-700 rounded-lg w-full mb-2">
          {error}
        </div>
      )} */}

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 w-full bg-white/90 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
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
  );
} 