import React from 'react';
import Link from 'next/link';
import { SORTED_PAGES, SortType } from '@/data/filters';

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

export default async function Page() {

  return (
    <main className="flex min-h-screen flex-col items-start my-8 mx-2 lg:mx-6">
      <BrowseTheShelf />
      {/*<CollectionsGrid />*/}
    </main>
  );
}