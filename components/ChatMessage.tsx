import React from 'react';

export interface ChatMessageProps {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  type: 'text';
  className?: string;
}

export default function ChatMessage({ 
  content, 
  sender, 
  timestamp, 
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
        <p className={`text-sm ${isUser ? 'text-white' : 'text-gray-800'}`}>
          {content}
        </p>
        <p className={`text-xs mt-1 ${
          isUser ? 'text-blue-100' : 'text-gray-500'
        }`}>
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
} 