import React from 'react';
import { AlbumArtBox } from '@/components/album/AlbumArtBox';
import { FullAlbumDetails } from '@/data/types';

const ContentGrid = ({ data }: {data: FullAlbumDetails[]}) => {
  return (
    <section>
      <div className={'flex flex-wrap'}>
        {data.map((album, i) => (
          <AlbumArtBox album={album as FullAlbumDetails} key={i} />
        ))}
      </div>
    </section>
  );
}

export default ContentGrid
