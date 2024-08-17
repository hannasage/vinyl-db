import React from 'react';
import NewestAlbumsScroller from '@/components/organism/NewestAlbumsScroller';
import CollectionGrid from '@/components/organism/CollectionGrid';

export default async function Page() {
  return (
    <main className="flex min-h-screen flex-col items-start my-8">
      <NewestAlbumsScroller />
      <CollectionGrid />
    </main>
  );
}