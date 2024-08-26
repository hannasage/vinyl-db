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

const styleColors: Record<ThemeType, {
  bg: string,
  text: string,
  borderGradient: string,
  glow: string
}> = {
  blackWhite: {
    text: 'text-gray-100',
    bg: classNames(
      'bg-gradient-to-r',
      'from-gray-600',
      'to-gray-700',
      'pb-3',
      'rounded-lg'
    ),
    borderGradient: classNames('bg-gradient-to-br', 'from-gray-300', 'to-gray-300'),
    glow: 'drop-shadow-glowPurple'
  },
  blueGray: {
    text: 'text-gray-800',
    bg: classNames(
      'bg-gradient-to-r',
      'from-blue-200',
      'to-gray-300',
      'pb-3',
      'rounded-lg'
    ),
    borderGradient: classNames('bg-gradient-to-br', 'from-blue-300', 'to-gray-300'),
    glow: 'drop-shadow-glowPurple'
  },
  sunset: {
    text: 'text-white',
    bg: classNames(
      'bg-gradient-to-br',
      'from-pink-600',
      'to-purple-900',
      'pb-3',
      'rounded-lg'
    ),
    borderGradient: classNames('bg-gradient-to-br', 'from-red-500', 'to-purple-600'),
    glow: 'drop-shadow-glowSunset'
  },
  greenOut: {
    text: 'text-gray-200',
    bg: classNames(
      'bg-gradient-to-r',
      'from-green-600',
      'to-green-700',
      'text-gray-200',
      'pb-3',
      'rounded-lg'
    ),
    borderGradient: classNames('bg-gradient-to-br', 'from-green-400', 'to-green-600'),
    glow: ''
  }
}

type GetAlbumRes = FullAlbumDetails

export async function AlbumCard({
  albumId,
  background = true,
  showArtist = true,
  callout = false,
  theme = 'blackWhite'
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
        'w-[300px]',
        'flex flex-col',
        {
          [styleColors?.[theme].bg]: background,
        })
      }>
        <Image
          src={album.artwork_url}
          alt={`album art for ${album.title} - ${album.artist_name}`}
          width={300}
          height={300}
          className={'rounded-t-lg'}
        />

        {/* Album Info */}
        <em className={classNames(
          'mt-3',
          'mx-2',
          'whitespace-nowrap',
          'truncate',
          styleColors?.[theme].text
        )}>
          {album.title}
        </em>

        {showArtist &&
          <strong className={classNames(
          'mx-2',
            styleColors?.[theme].text
          )}>
            {album.artist_name}
          </strong>
        }

        <p className={classNames(
          'mx-2',
          'opacity-50',
          'text-sm',
          'whitespace-nowrap',
          'truncate',
          styleColors?.[theme].text
        )}>
          {album.release_year}{album.variant && `, ${album.variant}`}
        </p>
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
