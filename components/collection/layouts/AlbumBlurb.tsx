import React from 'react';
import * as AlbumCard from '@/components/collection/layouts/AlbumCard';
import classNames from 'classnames';
import { ThemeType } from '@/components/themeTypes';

export type Props = AlbumCard.Props & { blurb: string; reverse?: boolean, theme?: ThemeType }

export const id = 'album-blurb'
export function propsCheck(p: Props) {
  return !!p.blurb && !!p.albumId
}

const styleColors: Record<ThemeType, { bg: string, text: string }> = {
  blackWhite: { bg: 'bg-black', text: 'text-gray-200' },
  blueGray: { bg: 'bg-gray-900', text: 'text-blue-300'},
  sunset: { bg: 'bg-dusk', text: 'text-purple-400' },
  greenOut: { bg: 'bg-green-900', text: 'text-green-200' }
}

export async function AlbumBlurb({ albumId, blurb, reverse, showArtist, theme = 'blackWhite' }: Props) {
  return (
    <div className={`px-4 py-8 sm:p-8 lg:p-16 w-full mx-auto ${styleColors?.[theme].bg}`}>
      <section className={classNames(
        "flex",
        "flex-col",
        "w-full",
        "max-w-screen-lg",
        "mx-auto",
        "justify-between",
        "content-center",
        {
          ["md:flex-row-reverse"]: reverse,
          ["md:flex-row"]: !reverse
        }
      )}>
        <AlbumCard.AlbumCard albumId={albumId} callout={true} background={false} showArtist={showArtist} theme={theme} />
        <p className={classNames(
          'm-auto',
          'text-justify',
          'text-3xl',
          'font-light md:font-thin',
          'opacity-70',
          styleColors?.[theme].text,
          'max-w-[700px]',
          'leading-9 lg:leading-10',
          'tracking-tight',
          'p-8'
        )}>{blurb}</p>
      </section>
    </div>
  )
}

export function render(props: Props) {
  return propsCheck(props) ? <AlbumBlurb key={`blurb-${props.albumId}`} {...props} /> : <p>{id} failed propsCheck</p>
}
