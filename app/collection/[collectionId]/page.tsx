import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react';
import { Collection, CollectionEntry } from '@/data/types';
import Image from 'next/image';
import * as AlbumBlurb from '@/components/molecule/AlbumBlurb'
import * as AlbumCard from '@/components/molecule/AlbumCard'

interface GetCollectionRes extends Collection {
  entries: CollectionEntry[]
}

function renderLayout(layoutId: string, props: object, albumId: number) {
  const fullProps = {
    ...props,
    albumId
  }
  switch (layoutId) {
    case AlbumBlurb.id:
      return AlbumBlurb.render(fullProps as AlbumBlurb.Props)
    case AlbumCard.id:
      return AlbumCard.render(fullProps as AlbumCard.Props)
    default:
      return <p>Unknown layout {layoutId}</p>
  }
}

export default async function Page({ params }: { params: { collectionId: number } }) {
  const sb = createClient()
  const { data: collectionData, error: collectionError } = await sb.functions.invoke<GetCollectionRes>('get-collection', {
    body: { collectionId: params.collectionId }
  });
  if (!collectionData || collectionError) redirect('/error')
  return (
    <main className="flex min-h-screen flex-col items-start">
      {collectionData?.bannerImageUrl ? (
        <div className={"relative w-full h-[600px] -top-32 -z-10"}>
          <Image
            fill
            src={collectionData.bannerImageUrl}
            alt={`cover for collection: ${collectionData.title}`}
            className={"object-cover object-top"}
          />
          {/* Gradient Overlay */}
          <div
            className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black via-black/65 to-transparent">
            {/* Text Content */}
            <div className="w-full max-w-screen-lg mx-auto px-4 pb-10">
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-semibold tracking-tight">{collectionData!.title}</h1>
              <p className={"text-sm text-gray-400 italic"}>{collectionData!.shortDescription}</p>
              <p className={"text-sm text-gray-300 mt-4 w-full lg:max-w-[75%]"}>{collectionData!.longDescription}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col w-full max-w-screen-lg mx-auto px-4 pb-10">
          <h1
            className="text-2xl md:text-3xl lg:text-5xl font-semibold tracking-tight">{collectionData!.title}</h1>
          <p className={"text-sm text-gray-400 italic"}>{collectionData!.shortDescription}</p>
          <p className={"text-sm text-gray-300 mt-4 w-full lg:max-w-[45%]"}>{collectionData!.longDescription}</p>
        </div>
      )}
      <div className={"relative flex flex-wrap justify-center items-center -top-40 w-full"}>
        {collectionData.entries &&
          collectionData.entries
            .sort((eA, eB) => {
              if (eA.position === null) return -999
              return  eA.position - eB.position;
            })
            .map((e, idx) => {
              const Component = () => renderLayout(e.layout, e.layoutProps, e.albumId);
              return <Component key={`layout-${e.id}-${idx}`} />
            })
        }
      </div>
    </main>
  );
}