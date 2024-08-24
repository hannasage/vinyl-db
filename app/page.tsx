import React from 'react';
import NewestAlbumsScroller from '@/components/organism/NewestAlbumsScroller';
import CollectionGrid from '@/components/organism/CollectionGrid';
import './globals.css'

export default async function Page() {
  return (
    <div>
      <NewestAlbumsScroller />
      <CollectionGrid />
    </div>
  );
}