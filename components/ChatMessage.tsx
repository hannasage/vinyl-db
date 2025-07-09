import React from 'react';
import Image from 'next/image';
import CollectionStatus from './CollectionStatus';
import AlbumAction from './AlbumAction';
import BatchProgress from './BatchProgress';
import AlbumConfirmationCard from './AlbumConfirmationCard';

// Utility function to parse and render formatted text
const renderFormattedText = (text: string, isUser: boolean) => {
  if (!text) return null;

  // Helper function to process inline formatting
  const processInlineFormatting = (line: string, isUser: boolean) => {
    // Bold text: **text** or __text__
    let processed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Italic text: *text* or _text_
    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
    processed = processed.replace(/_(.*?)_/g, '<em>$1</em>');
    
    return processed;
  };

  // Split text into lines to process lists
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];
  let inList = false;
  let isNumberedList = false;

  const flushList = (isNumbered: boolean = false) => {
    if (currentList.length > 0) {
      const ListComponent = isNumbered ? 'ol' : 'ul';
      const listClassName = isNumbered ? 'list-decimal' : 'list-disc';
      
      elements.push(
        React.createElement(ListComponent, {
          key: `list-${elements.length}`,
          className: `${listClassName} list-inside space-y-1 my-2`
        }, currentList.map((item, index) => {
          const cleanItem = isNumbered ? item.replace(/^\d+\.\s*/, '') : item.replace(/^[-*•]\s*/, '');
          const formattedItem = processInlineFormatting(cleanItem, isUser);
          return (
            <li key={index} className="text-sm" dangerouslySetInnerHTML={{ __html: formattedItem }} />
          );
        }))
      );
      currentList = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Check for bullet points
    if (/^[-*•]\s/.test(trimmedLine)) {
      if (!inList) {
        flushList(isNumberedList);
        inList = true;
        isNumberedList = false;
      } else if (isNumberedList) {
        // Switch from numbered to bullet list
        flushList(true);
        inList = true;
        isNumberedList = false;
      }
      currentList.push(trimmedLine);
    }
    // Check for numbered lists
    else if (/^\d+\.\s/.test(trimmedLine)) {
      if (!inList) {
        flushList(isNumberedList);
        inList = true;
        isNumberedList = true;
      } else if (!isNumberedList) {
        // Switch from bullet to numbered list
        flushList(false);
        inList = true;
        isNumberedList = true;
      }
      currentList.push(trimmedLine);
    }
    // Regular text line
    else {
      if (inList) {
        flushList(isNumberedList);
        inList = false;
        isNumberedList = false;
      }
      
      if (trimmedLine) {
        const formattedLine = processInlineFormatting(trimmedLine, isUser);
        elements.push(
          <p key={`text-${index}`} className="text-sm mb-2 last:mb-0" 
             dangerouslySetInnerHTML={{ __html: formattedLine }} />
        );
      } else if (index < lines.length - 1) {
        // Add spacing for empty lines (but not at the end)
        elements.push(<div key={`spacer-${index}`} className="h-2" />);
      }
    }
  });

  // Flush any remaining list
  if (inList) {
    flushList(isNumberedList);
  }

  return elements.length > 0 ? elements : (
    <p className="text-sm">{text}</p>
  );
};

export interface ChatMessageProps {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  type: 'text' | 'image' | 'collection_status' | 'album_action' | 'batch_progress' | 'album_confirmation';
  imageUrl?: string;
  data?: any; // For collection query results, album actions, batch progress, or album confirmation
  className?: string;
  onAlbumConfirm?: (operationId: string, selectedArtworkUrl?: string) => void;
  onAlbumDeny?: (operationId: string) => void;
}

export default function ChatMessage({ 
  content, 
  sender, 
  timestamp, 
  type,
  imageUrl,
  data,
  className = '',
  onAlbumConfirm,
  onAlbumDeny
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
            <Image
              src={imageUrl}
              alt="Uploaded content"
              width={320}
              height={128}
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

        {/* Album Action Display */}
        {type === 'album_action' && data && (
          <div className="mb-2">
            <AlbumAction
              action={data.action}
              albumName={data.albumName}
              artistName={data.artistName}
              onConfirm={data.onConfirm}
              onCancel={data.onCancel}
              isLoading={data.isLoading}
            />
          </div>
        )}

        {/* Album Confirmation Display */}
        {type === 'album_confirmation' && data && data.isPending && onAlbumConfirm && onAlbumDeny && (
          <div className="mb-2">
            <AlbumConfirmationCard
              album={data.album}
              action={data.action}
              onConfirm={(selectedArtworkUrl) => onAlbumConfirm(data.operationId, selectedArtworkUrl)}
              onDeny={() => onAlbumDeny(data.operationId)}
              isLoading={data.isLoading}
            />
          </div>
        )}

        {/* Batch Progress Display */}
        {type === 'batch_progress' && data && (
          <div className="mb-2">
            <BatchProgress
              currentStep={data.currentStep}
              totalSteps={data.totalSteps}
              currentDescription={data.currentDescription}
              summary={data.summary}
              isComplete={data.isComplete}
              hasErrors={data.hasErrors}
            />
          </div>
        )}
        
        {/* Text Content */}
        {content && (
          <div className={`text-sm ${isUser ? 'text-white' : 'text-gray-800'} [&_strong]:font-semibold [&_em]:italic [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1 [&_*]:text-inherit [&_p]:text-inherit [&_li]:text-inherit [&_strong]:text-inherit [&_em]:text-inherit`}>
            {renderFormattedText(content, isUser)}
          </div>
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