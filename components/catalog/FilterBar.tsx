'use client';

import React from 'react';

interface FilterBarProps {
  currentSort: string;
  onSortChange: (sort: string) => void;
}

const sortOptions = [
  { value: 'artist-alphabetical', label: 'Artist A-Z' },
  { value: 'newest', label: 'Recently Added' },
  { value: 'orders-preorders', label: 'Orders & Preorders' },
];

export default function FilterBar({ currentSort, onSortChange }: FilterBarProps) {
  return (
    <div className="filter-bar">
      <div className="filter-content">
        <span className="text-[#b19cd9] font-medium mr-4">Sort by:</span>
        {sortOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onSortChange(option.value)}
            className={`filter-button ${
              currentSort === option.value ? 'active' : ''
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
} 