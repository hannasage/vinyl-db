'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { FaSpinner } from 'react-icons/fa';
import ContentGrid from '../../../components/ContentGrid';
import type { FullAlbumDetails } from '../../../data/types';

const EmailProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [albums, setAlbums] = useState<FullAlbumDetails[]>([]);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Check if we're returning from OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      processEmails(code);
      // Clean up the URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const processEmails = async (code?: string) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const { data, error: processError } = await supabase.functions.invoke('email-processor', {
        body: { code }
      });

      if (processError) throw processError;

      if (!data.url) {
        // If no URL is returned, emails were processed successfully
        setAlbums(data.albums || []);
      } else {
        // If URL is returned, we need OAuth authentication
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Error processing emails:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#94E8D1]">Email Processor</h2>
        <button
          onClick={() => processEmails()}
          disabled={isProcessing}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all
            ${isProcessing 
              ? 'bg-gray-600 cursor-not-allowed' 
              : 'bg-[#94E8D1] hover:bg-[#4ADE80] text-space-dark'}`}
        >
          {isProcessing ? (
            <>
              <FaSpinner className="animate-spin" />
              Processing...
            </>
          ) : (
            'Check Emails'
          )}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {albums.length > 0 && (
        <ContentGrid data={albums} />
      )}

      {albums.length === 0 && !isProcessing && !error && (
        <p className="text-gray-400 text-center py-8">
          No new albums found. Click the button above to check your emails.
        </p>
      )}
    </section>
  );
};

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-start my-8 mx-2 lg:mx-6">
      <EmailProcessor />
    </main>
  );
}