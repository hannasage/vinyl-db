import React from 'react';
import Link from 'next/link';
import { SORTED_PAGES, SortType } from '@/data/filters';
import { createClient } from '@/utils/supabase/server';
import { Collection } from '@/data/types';
import { redirect } from 'next/navigation';
import Image from 'next/image';

const BrowseTheShelf = () => {
  const colorScheme: Record<SortType['slug'], string> = {
    ['artist-alphabetical']: 'from-purple-500 to-pink-500',
    ['newest']: 'from-cyan-500 to-green-500',
    ['orders-preorders']: 'from-red-500 to-orange-500'
  };
  return (
    <section className={"flex flex-col w-[100%]"}>
      <h1 className={"text-xl mb-2"}>Browse</h1>
      <div className={"flex overflow-x-scroll w-[100%] no-scrollbar"}>
        {SORTED_PAGES.map((p, idx) => (
          <Link key={idx} href={`/browse/${p.slug}`}>
            <div className={`bg-gradient-to-bl p-4 mr-4 mb-4 w-[225px] rounded-2xl max-md:h-20 ${colorScheme[p.slug]}`}>
              <h2 className={'text-2xl tracking-tight'}>{p.label}</h2>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function CollectionCard({ coverImageUrl, title, shortDescription }: Pick<Collection, "coverImageUrl" | "title" | "shortDescription">) {
  return (
    <div className="relative rounded-lg shadow-lg bg-gray-900 w-full md:w-[45%] lg:w-[20%]">
      {/* Cover Image */}
      <div className="relative w-full h-auto pb-[125%]">
        <Image
          style={{
            borderRadius: "0.5rem",
          }}
          src={coverImageUrl || ""}
          alt={title}
          fill
          className="absolute inset-0 object-cover w-full h-full"
        />
      </div>
      {/* Gradient Overlay */}
      <div className="z-9 absolute top-0 inset-0 flex flex-col justify-end bg-gradient-to-t from-black via-black/80 to-transparent" />
      {/* Text Content */}
      <div className="absolute bottom-0 z-10 p-4 tracking-tight">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm mt-1 text-gray-400">{shortDescription.toLowerCase()}</p>
      </div>
    </div>
  );
}

const CollectionsGrid = async () => {
  const sb = createClient();
  const { data, error } =
    await sb.functions.invoke<{ collections: Collection[] }>('get-collections-list');
  if (error) redirect('/error');
  return (
    <section className={'w-full h-auto'}>
      <h2 className={"text-xl mb-2"}>Collections</h2>
      <div className={"flex flex-col md:flex-row md:flex-wrap gap-4"}>
        {data?.collections?.length ? (
          data.collections.map((c, idx) => (
            <CollectionCard
              key={`ColelctionCard-${c.title}-p-${idx}`}
              coverImageUrl={c.coverImageUrl}
              title={c.title}
              shortDescription={c.shortDescription}
            />
          ))
        ) : (
          <p>No collections to show</p>
        )}
      </div>
    </section>
  )
}

export default async function Page() {
  return (
    <main className="flex min-h-screen flex-col items-start my-8 mx-2 lg:mx-6">
      <BrowseTheShelf />
      <CollectionsGrid />
    </main>
  );
}