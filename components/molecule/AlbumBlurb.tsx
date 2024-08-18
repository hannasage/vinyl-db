import React from 'react';
import * as AlbumCard from '@/components/molecule/AlbumCard';
import classNames from 'classnames';

export type Props = AlbumCard.Props & { blurb: string; }

export const id = 'album-blurb'
export function propsCheck(p: Props) {
  return !!p.blurb && !!p.albumId
}


export async function AlbumBlurb({ albumId, blurb }: Props) {
  return (
    <div className={"px-4 py-8 sm:p-8 lg:p-16 mb-8 w-full mx-auto bg-gray-900"}>
      <section className={classNames(
        "flex",
        "flex-col",
        "md:flex-row",
        "w-full",
        "max-w-screen-lg",
        "mx-auto",
        "justify-between",
        "content-center"
      )}>
        <AlbumCard.AlbumCard albumId={albumId} showArtist={false} background={false} callout={true} />
        <p className={classNames(
          'm-auto',
          // 'text-justify sm:text-right lg:text-justify',
          'text-3xl',
          'font-thin',
          'opacity-70',
          'text-blue-400',
          'max-w-[700px]',
          'leading-10',
          // 'tracking-tight',
          'p-8'
        )}>{blurb}</p>
      </section>
    </div>
  )
}

export function render(props: Props) {
  return propsCheck(props) ? <AlbumBlurb key={`blurb-${props.albumId}`} {...props} /> : <p>{id} failed propsCheck</p>
}
