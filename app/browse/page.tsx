import React from 'react';
import BrowseTheShelf from '@/components/BrowseTheShelf';
import CollectionGrid from '@/components/CollectionGrid';

export default async function Page() {
  return (
    <main className="flex min-h-screen flex-col items-start my-8 mx-2 lg:mx-6">
      <BrowseTheShelf />
      <CollectionGrid />
    </main>
  );
}