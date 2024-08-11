import { sortLegacyEntries } from '@/data/filters';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { FullAlbumDetails } from '@/data/types';
import React from 'react';
import CollectionsGrid from '@/components/CollectionsGrid';

const Card = () => {
  return (
    <div>
      Card
    </div>
  )
}

const BrowseTheShelf = () => {
  return (
    <section>
      <Card />
      <Card />
      <Card />
    </section>
  )
}

export default async function Page() {
  const sb = createClient()
  const { data, error } = await sb.functions.invoke('get-collection');
  if (error) redirect('/error')
  const sortedAlbums = sortLegacyEntries(data.data, 'newest')

  return (
    <main className="flex min-h-screen flex-col items-start my-8 mx-2 lg:mx-6">
      <BrowseTheShelf />
      <CollectionsGrid albums={(sortedAlbums as FullAlbumDetails[])} />
    </main>
  );
}