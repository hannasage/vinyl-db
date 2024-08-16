import React from 'react';
import AlbumCover from '@/components/molecule/AlbumCover';
import { FullAlbumDetails } from '@/data/types';

const AlbumGrid = ({ albums }: { albums: FullAlbumDetails[] }) => {
    return (
      <div className="flex flex-wrap">
        {albums?.length > 0 ? (
          albums.map((album, index) => (
            <div key={index} className="w-1/2 md:w-1/3 xl:w-1/4 2xl:w-1/5 aspect-square bg-gray-200 flex flex-wrap justify-center items-center">
                <AlbumCover album={album} />
            </div>
          ))) : <em className={"text-gray-500"}>No data</em>}
      </div>
    );
};

export default AlbumGrid;