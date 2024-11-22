import Image from 'next/image';
import React from 'react';
import { FullAlbumDetails } from '@/data/types';
import { MatrixBoxBaseProps } from '@/components/MatrixBox';

export type AlbumArtBaseProps = Pick<FullAlbumDetails, "artist_name" | "artwork_url" | "title">;

export const AlbumArtBox = ({ artwork_url, title, artist_name, size, className }: MatrixBoxBaseProps & AlbumArtBaseProps) => {
  return <Image
    src={artwork_url}
    alt={`album art for ${title} - ${artist_name}`}
    width={size}
    height={size}
    className={className}
  />
}
