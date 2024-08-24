import React from 'react';
import NewestAlbumsScroller from '@/components/sections/NewestAlbumsScroller';
import CollectionGrid from '@/components/collection/CollectionGrid';
import './globals.css'

export default async function Page() {
  return (
    <div>
      <NewestAlbumsScroller />
      <CollectionGrid />
    </div>
  );
}