import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react';
import { Collection, CollectionEntry } from '@/data/types';
import Image from 'next/image';
import * as AlbumBlurb from '@/components/molecule/AlbumBlurb'
import * as AlbumCard from '@/components/molecule/AlbumCard'
import classNames from 'classnames';
import Link from 'next/link';
import type { Metadata } from 'next'

interface Props { params: { collectionId: number } }

async function fetchCollection(collectionId: number) {
  const sb = createClient();
  const {
    data: collectionData,
    error: collectionError,
  } = await sb.functions.invoke<GetCollectionRes>('get-collection', {
    body: { collectionId },
  });
  if (!collectionData || collectionError) redirect('/error');
  return { collectionData, collectionError }
}

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const { collectionData } = await fetchCollection(params.collectionId)
  return {
    title: `${collectionData.title} — some chick's vinyl collection`,
    description: collectionData.longDescription,
    openGraph: {
      images: [collectionData.bannerImageUrl || collectionData.coverImageUrl || ""],
    },
  }
}

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

function BackButton() {
  return (
    <div className={classNames(
      'py-10',
    )}>
      <Link className={classNames(
        'bg-gradient-to-br from-red-500 to-purple-500',
        'drop-shadow-glowPurple',
        'px-6 py-3',
        'text-white',
        'font-semibold',
        'rounded-full',
      )} href={'/'}>Back</Link>
    </div>
  )
}

export default async function Page({ params }: Props) {
  const { collectionData } = await fetchCollection(params.collectionId)
  return (
    <div className="flex min-h-screen flex-col items-start">
      {collectionData?.bannerImageUrl ? (
        <div className={"page-hero-container"}>
          <Image
            fill
            src={collectionData.bannerImageUrl}
            alt={`cover for collection: ${collectionData.title}`}
          />
          {/* Gradient Overlay */}
          <div className="gradient-overlay">
            <div className={'flex flex-col justify-end h-full'}>
              <div className="w-full max-w-screen-lg mx-auto px-4 pb-10">
                <div className={classNames(
                  'py-10',
                )}>
                  <Link className={classNames(
                    'bg-gradient-to-br from-red-500 to-purple-500',
                    'drop-shadow-glowPurple',
                    'px-6 py-3',
                    'hover:cursor-pointer',
                    'text-white',
                    'font-semibold',
                    'rounded-full',
                  )} href={'/'}>Back</Link>
                </div>
                <h1 className="section-heading text-4xl">{collectionData!.title}</h1>
                <p className={'text-sm text-gray-400 italic'}>{collectionData!.shortDescription}</p>
                <p className={'text-sm text-gray-300 mt-4 w-full lg:max-w-[75%]'}>{collectionData!.longDescription}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col w-full max-w-screen-lg mx-auto px-4 pb-10">
          <BackButton />
          <h1 className={'font-black tracking-tighter '}>{collectionData!.title}</h1>
          <p className={'text-sm text-gray-400 italic'}>{collectionData!.shortDescription}</p>
          <p className={'text-sm text-gray-300 mt-4 w-full lg:max-w-[45%]'}>{collectionData!.longDescription}</p>
        </div>
      )}
      <div className={'relative flex flex-wrap justify-center items-center w-full'}>
        {collectionData.entries &&
          collectionData.entries
            .sort((eA, eB) => {
              if (eA.position === null) return -999;
              return eA.position - eB.position;
            })
            .map((e, idx) => {
              const Component = () => renderLayout(e.layout, e.layoutProps, e.albumId);
              return <Component key={`layout-${e.id}-${idx}`} />
            })
        }
      </div>
    </div>
  );
}