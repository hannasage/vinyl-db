import React from 'react';
import CollectionStatus from './CollectionStatus';

export interface ChatMessageProps {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  type: 'text' | 'image' | 'collection_status';
  imageUrl?: string;
  data?: any; // For collection query results
  className?: string;
}

export default function ChatMessage({ 
  content, 
  sender, 
  timestamp, 
  type,
  imageUrl,
  data,
  className = '' 
}: ChatMessageProps) {
  const isUser = sender === 'user';
  
  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${className}`}
    >
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-800'
        }`}
      >
        {/* Image Display */}
        {type === 'image' && imageUrl && (
          <div className="mb-2">
            <img
              src={imageUrl}
              alt="Uploaded content"
              className="w-full h-32 object-cover rounded-lg"
            />
          </div>
        )}
        
        {/* Collection Status Display */}
        {type === 'collection_status' && data && (
          <div className="mb-2">
            <CollectionStatus
              found={data.found}
              albums={data.albums}
              albumName={data.albumName}
              artistName={data.artistName}
              message={data.message}
            />
          </div>
        )}
        
        {/* Text Content */}
        {content && (
          <p className={`text-sm ${isUser ? 'text-white' : 'text-gray-800'}`}>
            {content}
          </p>
        )}
        
        {/* Timestamp */}
        <p className={`text-xs mt-1 ${
          isUser ? 'text-blue-100' : 'text-gray-500'
        }`}>
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
} 