import React from 'react';
import { FullAlbumDetails } from '@/data/types';

const CollectionsGrid = ({ albums }: { albums: FullAlbumDetails[] }) => {
  return albums?.length > 0 ? (
    /*  */
    <></>
  ) : <em className={"text-gray-500"}>No data</em>
};

export default CollectionsGrid;
