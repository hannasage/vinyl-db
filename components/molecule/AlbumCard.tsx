import Image from 'next/image';
import React, { PropsWithChildren } from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { FullAlbumDetails } from '@/data/types';
import classNames from 'classnames';

export type Props = { albumId: number, callout?: boolean, background?: boolean, showArtist?: boolean }

export const id = 'album-card'
export function propsCheck(p: Props) {
  return p && p.albumId
}

type GetAlbumRes = FullAlbumDetails

export async function AlbumCard({ albumId, background = true, showArtist = true, callout = false }: Props) {
  const sb = createClient()
  const { data: album, error: albumError } = await sb.functions.invoke<GetAlbumRes>('get-album', {
    body: { albumId: albumId }
  });
  if (!album || albumError) redirect('/error')

  const CalloutWrapper = (props: PropsWithChildren) => {
    return (
        <div className={classNames(
          'self-start',
          'mx-auto',
          'my-auto',
          'p-1.5',
          'rounded-sm',
          'bg-gradient-to-br',
          'from-purple-300',
          'to-blue-500',
          'shadow-lg',
          'drop-shadow-glowPurple'
        )}>
          <div className={classNames(
            'bg-gradient-to-r',
            'from-gray-700',
            'to-gray-900',
            'pb-3',
            'rounded-lg'
          )}>
            {props.children}
          </div>
        </div>
    );
  }

  const Card = () => {
    return (
      <div className={`w-[250px] flex flex-col`}>
        <Image
          src={album.artwork_url}
          alt={`album art for ${album.title} - ${album.artist_name}`}
          width={250}
          height={250}
          className={'rounded-t-lg'}
        />
        <em className={'mt-3 ml-2 text-gray-200'}>{album.title}</em>
        {showArtist && <p className={'ml-2 text-gray-200'}>{album.artist_name}</p>}
        <em className={'ml-2 text-gray-400'}>{album.release_year}</em>
      </div>
    )
  }

  return callout ? (
    <CalloutWrapper>
      <Card />
    </CalloutWrapper>
  ) : (
    <Card />
  );
}

export function render(props: Props) {
  return propsCheck(props) ? <AlbumCard {...props} /> : <p>{id} failed propsCheck</p>
}
