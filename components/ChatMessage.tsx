import React from 'react';
import Image from 'next/image';
import CollectionStatus from './CollectionStatus';
import AlbumAction from './AlbumAction';
import BatchProgress from './BatchProgress';
import AlbumConfirmationCard from './AlbumConfirmationCard';

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
            : 'bg-gray-200 text-gray-800 agent-bubble'
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
        {type === 'album_confirmation' && data && onAlbumConfirm && onAlbumDeny && (
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
          isUser ? (
            <p className={`text-sm ${isUser ? 'text-white' : 'text-gray-800'}`}>{content}</p>
          ) : (
            <p className={`text-sm ${isUser ? 'text-white' : 'text-gray-800'}`} dangerouslySetInnerHTML={{ __html: content }} />
          )
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