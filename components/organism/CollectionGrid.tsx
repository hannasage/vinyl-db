import React from 'react';
import CollectionCard from '../molecule/CollectionCard';
import { Collection } from '@/data/types';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { sortByTime } from '@/data/filters';

export default async function CollectionGrid() {
  const sb = createClient();
  const { data, error } =
    await sb.functions.invoke<{ collections: Collection[] }>('get-collection-list');
  if (error) redirect('/error');
  return data?.collections.length ? (
    <>
      <h1 className={"text-xl mb-4 mx-2 lg:mx-10 tracking-tight"}>Collections</h1>
      <section className="mx-2 lg:mx-10 columns-2 md:columns-3 lg:columns-4 gap-4">
        {data.collections
          .sort((a, b) => sortByTime(new Date(a.created_at), new Date(b.created_at)))
          .map((collection, index) => (
          <div key={index} className="mb-4 break-inside-avoid">
            <CollectionCard
              coverImageUrl={collection.coverImageUrl}
              title={collection.title}
              id={collection.id}
              shortDescription={collection.shortDescription}
            />
          </div>
        ))}
      </section>
    </>
  ) : <p>No Data</p>;
}
