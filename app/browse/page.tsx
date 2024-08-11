import React from 'react';
import Link from 'next/link';
import { SORTED_PAGES } from '@/data/filters';

const Card = ({label}: {label: string}) => {
  return (
    <div className={"bg-amber-300 p-4 w-[225px] rounded-2xl"}>
      <h1 className={"text-2xl tracking-tight"}>{label}</h1>
    </div>
  )
}

const BrowseTheShelf = () => {
  return (
    <section className={"flex gap-8"}>
      {SORTED_PAGES.map((p, idx) => (
        <Link key={idx} href={`/browse/${p.slug}`}><Card label={p.label} /></Link>
      ))}
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