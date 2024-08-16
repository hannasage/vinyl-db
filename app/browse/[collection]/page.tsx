import React from 'react';
import AlbumGrid from '@/components/AlbumGrid';
import { createClient } from '@/utils/supabase/server';
import { SortType, sortLegacyEntries } from '@/data/filters';
import { FullAlbumDetails } from '@/data/types';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function Page({ params }: { params: { collection: SortType['slug'] } }) {
  const sb = createClient()
  const { data, error } = await sb.functions.invoke('get-collection');
  if (error) redirect('/error')
  const sortedAlbums = sortLegacyEntries(data.data, params.collection)

  return (
    <main className="flex min-h-screen flex-col items-start my-8 mx-2 lg:mx-6">
      {/* TODO: better back-nav ui */}
      <Link className={"mb-2 text-xl"} href={'/browse'}>Back</Link>
      {/* TODO: this render will become dynamic based on each entry in the collection's
            layout property.
       */}
      <AlbumGrid albums={(sortedAlbums as FullAlbumDetails[])} />
    </main>
  );
}