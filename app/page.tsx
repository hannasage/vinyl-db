import React from 'react';
import BrowseOptions from '@/components/organism/BrowseOptions';
import CollectionGrid from '@/components/organism/CollectionGrid';

export default async function Page() {
  return (
    <main className="flex min-h-screen flex-col items-start my-8 mx-2 lg:mx-6">
      <BrowseOptions />
      <CollectionGrid />
    </main>
  );
}