'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface CatalogNavigationProps {
  onSearch: (query: string) => void;
}

export default function CatalogNavigation({ onSearch }: CatalogNavigationProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  return (
    <nav className="catalog-nav">
      <div className="catalog-nav-content">
        <div className="aero-search-bar">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#b0b0b0] w-5 h-5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search albums, artists..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="aero-search-input"
          />
        </div>
      </div>
    </nav>
  );
} 