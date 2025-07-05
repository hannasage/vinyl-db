'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import ChatMessage from './ChatMessage';
import ImageUpload from './ImageUpload';
import { ChatMessageType, ChatResponse } from '../data/types';
import { createClient } from '../utils/supabase/client';
import { memoryManager } from '../utils/agent/memory';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Clear memory when component mounts (start fresh)
  useEffect(() => {
    memoryManager.clearMessages();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Clean up blob URLs when component unmounts
  useEffect(() => {
    return () => {
      // Clean up all blob URLs in messages
      messages.forEach(message => {
        if (message.imageUrl && message.imageUrl.startsWith('blob:')) {
          URL.revokeObjectURL(message.imageUrl);
        }
      });
      // Clean up selected image blob URL
      if (selectedImageUrl && selectedImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(selectedImageUrl);
      }
    };
  }, [messages, selectedImageUrl]);

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
    
    // Keep the blob URL for the message preview - don't revoke it here
    setSelectedImageUrl(null);
    
    // Add user message to short-term memory
    memoryManager.addMessage(userMessage);
    
    setIsLoading(true);

    try {
      const supabase = createClient();
      
      // Get conversation context from short-term memory
      const conversationContext = memoryManager.getConversationContext(10);
      
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

  const handleRemoveImage = () => {
    if (selectedImageUrl && selectedImageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(selectedImageUrl);
    }
    setSelectedImageUrl(null);
    setSelectedImage(null);
  };

  const handleAlbumConfirm = async (operationId: string) => {
    const confirmation = pendingConfirmations.get(operationId);
    if (!confirmation) {
      console.error('Confirmation not found for operation:', operationId);
      return;
    }

    try {
      const supabase = createClient();
      
      const { data, error } = await supabase.functions.invoke('execute-confirmed-operation', {
        body: {
          operationId,
          originalOperation: confirmation.originalOperation
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

  const canSend = (inputValue.trim() || selectedImage) && !isLoading;

  return (
    <div className={`flex flex-col h-screen w-full bg-white ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-semibold text-gray-900">Vinyl Collection Assistant</h1>
        </div>
      </div>

      {/* Message List Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full">
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
        <div className="px-4 py-2 bg-red-100 border border-red-300 text-red-700 rounded-lg mx-auto max-w-4xl w-full mb-2">
          {error}
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 w-full bg-white">
        <div className="max-w-4xl mx-auto flex items-center space-x-2">
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
  );
} 