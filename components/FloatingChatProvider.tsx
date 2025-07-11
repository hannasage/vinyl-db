'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import FloatingChatButton from './FloatingChatButton';
import ChatModal from './ChatModal';

export default function FloatingChatProvider() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Check initial auth state
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setIsLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setIsAuthenticated(!!session?.user);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleOpenChat = () => {
    setIsModalOpen(true);
  };

  const handleCloseChat = () => {
    setIsModalOpen(false);
  };

  const handleButtonClick = () => {
    if (isModalOpen) {
      handleCloseChat();
    } else {
      handleOpenChat();
    }
  };

  // Don't render anything while checking auth state
  if (isLoading) {
    return null;
  }



  return (
    <>
      <FloatingChatButton 
        onOpen={handleButtonClick} 
        isVisible={isAuthenticated} 
        isModalOpen={isModalOpen}
      />
      <ChatModal 
        isOpen={isModalOpen} 
        onClose={handleCloseChat} 
      />
    </>
  );
} 