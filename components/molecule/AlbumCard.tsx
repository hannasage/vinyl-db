import Image from 'next/image';
import React, { PropsWithChildren } from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { FullAlbumDetails } from '@/data/types';
import classNames from 'classnames';
import { ThemeType } from '@/components/themeTypes';

export type Props = {
  albumId: number,
  background?: boolean,
  callout?: boolean,
  showArtist?: boolean,
  theme?: ThemeType
}

export const id = 'album-card'
export function propsCheck(p: Props) {
  return p && p.albumId
}

const styleColors: Record<ThemeType, { bg: string, borderGradient: string, glow: string }> = {
  blueGray: {
    bg: classNames(
      'bg-gradient-to-r',
      'from-gray-700',
      'to-gray-900',
      'pb-3',
      'rounded-lg'
    ),
    borderGradient: classNames('bg-gradient-to-br', 'from-purple-300', 'to-blue-500'),
    glow: 'drop-shadow-glowPurple'
  },
  sunset: {
    bg: classNames(
      'bg-gradient-to-br',
      'from-pink-600',
      'to-purple-900',
      'pb-3',
      'rounded-lg'
    ),
    borderGradient: classNames('bg-gradient-to-br', 'from-red-500', 'to-purple-600'),
    glow: 'drop-shadow-glowSunset'
  }
}

type GetAlbumRes = FullAlbumDetails

export async function AlbumCard({
  albumId,
  background = true,
  showArtist = true,
  callout = false,
  theme = 'blueGray'
}: Props) {
  const sb = createClient()
  const { data: album, error: albumError } = await sb.functions.invoke<GetAlbumRes>('get-album', {
    body: { albumId: albumId }
  });
  if (!album || albumError) redirect('/error')

  const CalloutWrapper = (props: PropsWithChildren) => {
    return (
      <div className={classNames(
        'self-start',
        'mx-auto md:mx-8',
        'my-auto md:my-4',
        'p-1.5',
        'rounded-sm',
        styleColors?.[theme].borderGradient,
        'shadow-lg',
        styleColors?.[theme].glow
      )}>
        <div className={styleColors?.[theme].bg}>
          {props.children}
        </div>
      </div>
    );
  }

  const Card = () => {
    return (
      <div className={classNames(
        'w-[250px]',
        'flex flex-col',
        {
          [styleColors?.[theme].bg]: background,
        })
      }>
        <Image
          src={album.artwork_url}
          alt={`album art for ${album.title} - ${album.artist_name}`}
          width={250}
          height={250}
          className={'rounded-t-lg'}
        />
        <em className={'mt-3 mx-2 whitespace-nowrap truncate text-gray-200'}>{album.title}</em>
        {showArtist && <p className={'mx-2 text-gray-200'}>{album.artist_name}</p>}
        <em className={'mx-2 text-gray-400'}>{album.release_year}</em>
      </div>
    )
  }

  return callout ? (
    <CalloutWrapper>
      <Card />
    </CalloutWrapper>
  ) : (
    <div className={classNames("m-4")}>
      <Card />
    </div>
  );
}

export function render(props: Props) {
  return propsCheck(props) ? <AlbumCard {...props} /> : <p>{id} failed propsCheck</p>
}
