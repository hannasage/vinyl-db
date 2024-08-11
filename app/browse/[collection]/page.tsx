import React from 'react';
import AlbumGrid from '@/components/AlbumGrid';
import { createSupabaseClient } from '@/utils/supabase/createSupabaseClient';
import { SortType, sortLegacyEntries } from '@/data/filters';
import { getFullList } from '@/utils/supabase/queries';
import { FullAlbumDetails } from '@/data/types';
import Pill from '@/components/atom/Pill';

export default async function Page({ params }: { params: { collection: SortType['slug'] } }) {
  const sb = createSupabaseClient()
  const data = await getFullList(sb);
  const sortedAlbums = sortLegacyEntries(data, params.collection)

  return (
    <main className="flex min-h-screen flex-col items-start my-8 mx-2 lg:mx-6">
      {/*<div className="flex items-start w-full top-0 sticky z-10 bg-gradient-to-b from-black">*/}
      {/*  <Pill text={"D"} className={"px-6 my-6"}/>*/}
      {/*</div>*/}
      <AlbumGrid albums={(sortedAlbums as FullAlbumDetails[])} />
    </main>
  );
}