import React from 'react';
import { AlbumArtBox } from '@/components/boxes/AlbumArtBox';

const ContentGrid = ({data}: {data: Array<any>}) => {

  return (
    <section>
      <div className={'flex flex-wrap'}>
        {data.list.map((album, i) => (<AlbumArtBox album={album} key={i} />))}
      </div>
    </section>
  );
}

export default ContentGrid
