import React from 'react';
import CollectionCard from '../molecule/CollectionCard';
import { Collection } from '@/data/types';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { sortByTime } from '@/data/filters';
import classNames from 'classnames';

export default async function CollectionGrid() {
  const sb = createClient();
  const { data, error } =
    await sb.functions.invoke<{ collections: Collection[] }>('get-collection-list');
  if (error) redirect('/error');
  return data?.collections.length ? (
    <div className={"page-container"}>
      <h2 className={"section-heading"}>Collections</h2>
      <section className="mt-8 columns-2 md:columns-3 lg:columns-4 gap-4">
        {data.collections
          .sort((a, b) => sortByTime(new Date(a.created_at), new Date(b.created_at)))
          .map((collection, index) => (
          <div key={index} className={classNames(
            'mb-4',
            'break-inside-avoid',
          )}>
            <CollectionCard
              coverImageUrl={collection.coverImageUrl}
              title={collection.title}
              id={collection.id}
              shortDescription={collection.shortDescription}
            />
          </div>
        ))}
      </section>
    </div>
  ) : <p>No Data</p>;
}
