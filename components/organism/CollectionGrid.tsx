import React from 'react';
import CollectionCard from '../molecule/CollectionCard';
import { Collection } from '@/data/types';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function CollectionGrid() {
  const sb = createClient();
  const { data, error } =
    await sb.functions.invoke<{ collections: Collection[] }>('get-collections-list');
  if (error) redirect('/error');
  return data?.collections.length ? (
    <>
      <h1 className={"text-xl mb-4"}>Collections</h1>
      <section className="columns-1 sm:columns-2 lg:columns-3 gap-4">
        {data.collections.map((collection, index) => (
          <div key={index} className="mb-4 break-inside-avoid">
            <CollectionCard
              coverImageUrl={collection.coverImageUrl}
              title={collection.title}
              shortDescription={collection.shortDescription}
            />
          </div>
        ))}
      </section>
    </>
  ) : <p>No Data</p>;
}
