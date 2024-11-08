import Image from 'next/image';
import React from 'react';
import { FullAlbumDetails } from '@/data/types';

type Props =
  Pick<FullAlbumDetails, "artist_name" | "artwork_url" | "title"> &
  {
    size: number,
    className?: string
  }

export const AlbumArt = ({ artwork_url, title, artist_name, size, className }: Props) => {
  return <Image
    src={artwork_url}
    alt={`album art for ${title} - ${artist_name}`}
    width={size}
    height={size}
    className={className}
  />
}