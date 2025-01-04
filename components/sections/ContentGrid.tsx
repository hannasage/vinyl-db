import React from 'react';
import { AlbumArtBox } from '@/components/boxes/AlbumArtBox';
import { AlbumListRes } from '@/app/v2/page';
import { FullAlbumDetails } from '@/data/types';

const ContentGrid = ({ data }: {data: AlbumListRes}) => {
  return (
    <section>
      <div className={'flex flex-wrap'}>
        {data.list.map((album, i) => (
          <AlbumArtBox album={album as FullAlbumDetails} key={i} />
        ))}
      </div>
    </section>
  );
}

export default ContentGrid
