import React from 'react';
import NewestAlbumsScroller from '@/components/organism/NewestAlbumsScroller';
import CollectionGrid from '@/components/organism/CollectionGrid';

// export async function NewestCarousel() {
//   const sb = createClient()
//   const { data, error } = await sb.functions.invoke('get-album-list', { body: {
//       list: "newest"
//     }});
//   if (error) redirect('/error')
//   return (
//     <section className={"flex flex-row"}>
//
//     </section>
//   )
// }

export default async function Page() {
  return (
    <main className="flex min-h-screen flex-col items-start my-8 mx-2 lg:mx-6">
      <NewestAlbumsScroller />
      <CollectionGrid />
    </main>
  );
}