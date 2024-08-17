import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react';
import { Collection, CollectionEntry } from '@/data/types';
import Image from 'next/image';

interface GetCollectionRes {
  meta: Collection
  entries: CollectionEntry[]
}

export default async function Page({ params }: { params: { collectionId: number } }) {
  const sb = createClient()
  const { data: collectionData, error: collectionError } = await sb.functions.invoke<GetCollectionRes>('get-collection', {
    body: { collectionId: params.collectionId }
  });
  if (
    !collectionData?.meta ||
    !collectionData.entries.length ||
    collectionError
  ) redirect('/error')
  return (
    <main className="flex min-h-screen flex-col items-start">
      <div className={"relative w-full h-[30rem] "}>
        <Image
          fill
          src={collectionData.meta.coverImageUrl || ""}
          alt={`cover for collection: ${collectionData.meta.title}`}
          className={"object-cover object-[0px 400px]"}
        />
      </div>
      <h1>{collectionData!.meta.title}</h1>
    </main>
  );
}