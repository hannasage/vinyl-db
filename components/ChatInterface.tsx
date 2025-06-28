'use client';

import React, { useState } from 'react';
import ChatMessage from './ChatMessage';
import ImageUpload from './ImageUpload';
import { ChatMessage as ChatMessageType, ChatResponse } from '../data/types';
import { createClient } from '../utils/supabase/client';

interface ChatInterfaceProps {
  className?: string;
}

export default function ChatInterface({ className = '' }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    setError(null);
  };

  const handleImageError = (message: string) => {
    setError(message);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const supabase = createClient();
    
    const formData = new FormData();
    formData.append('file', file);

    const { data, error } = await supabase.functions.invoke('upload-image', {
      body: formData
    });

    if (error) {
      throw new Error(error.message || 'Failed to upload image');
    }

    if (!data?.url) {
      throw new Error('No URL returned from upload');
    }

    return data.url;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && !selectedImage) return;

    let uploadedImageUrl: string | undefined;
    const imageFile = selectedImage;

    // Upload image first if present
    if (imageFile) {
      setIsUploading(true);
      try {
        uploadedImageUrl = await uploadImage(imageFile);
      } catch (error) {
        console.error('Image upload error:', error);
        setError('Failed to upload image. Please try again.');
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      content: inputValue.trim() || '',
      sender: 'user',
      timestamp: new Date(),
      type: imageFile ? 'image' : 'text',
      imageUrl: uploadedImageUrl || (imageFile ? URL.createObjectURL(imageFile) : undefined),
      imageFile: imageFile || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('chat-response', {
        body: { 
          message: userMessage.content,
          hasImage: !!imageFile,
          imageUrl: uploadedImageUrl
        }
      });

      if (error) {
        throw error;
      }

      const response = data as ChatResponse;
      const agentMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        content: response.message,
        sender: 'agent',
        timestamp: new Date(response.timestamp),
        type: 'text'
      };

      setMessages(prev => [...prev, agentMessage]);
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

  const canSend = (inputValue.trim() || selectedImage) && !isUploading;

  return (
    <div className={`flex flex-col h-screen w-full bg-white ${className}`}>
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
            />
          ))
        )}
        {(isLoading || isUploading) && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm">
                  {isUploading ? 'Uploading image...' : 'Processing...'}
                </span>
              </div>
            </div>
          </div>
        )}
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
            iconOnly
          />
          {/* If image selected, show thumbnail */}
          {selectedImage && (
            <div className="relative mr-2">
              <img
                src={URL.createObjectURL(selectedImage)}
                alt="Selected"
                className="w-10 h-10 object-cover rounded-lg border border-gray-300"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 transition-colors text-xs"
                type="button"
                disabled={isUploading}
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
            disabled={isLoading || isUploading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!canSend || isLoading || isUploading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? 'Uploading...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
} 