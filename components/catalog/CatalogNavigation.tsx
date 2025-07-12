'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface CatalogNavigationProps {
  onSearch: (query: string) => void;
}

export default function CatalogNavigation({ onSearch }: CatalogNavigationProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  const handleExpand = () => {
    setIsExpanded(true);
    // Focus input after expansion animation
    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  };

  const handleCollapse = useCallback(() => {
    setSearchQuery('');
    onSearch('');
    setIsExpanded(false);
    inputRef.current?.blur();
  }, [onSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCollapse();
    }
  };

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setIsAuthenticated(!!session?.user);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Handle clicks outside to collapse
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isExpanded && !searchQuery) {
          handleCollapse();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded, searchQuery, handleCollapse]);

  return (
    <nav className={`catalog-nav ${isAuthenticated ? 'with-chat-button' : ''}`}>
      <div className="catalog-nav-content">
        <div 
          ref={containerRef}
          className={`aero-search-bar ${isExpanded ? 'expanded' : 'collapsed'}`}
          onClick={!isExpanded ? handleExpand : undefined}
        >
          <Search className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search albums, artists..."
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            className="aero-search-input"
            tabIndex={isExpanded ? 0 : -1}
          />
          {isExpanded && (searchQuery || isExpanded) && (
            <button
              onClick={handleCollapse}
              className="clear-button"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
} 