"use client"
import React, { useState } from 'react';
import { FullAlbumDetails } from '@/data/types';
import AlbumCover from '@/components/atom/AlbumCover';
import classNames from 'classnames';

export const AlbumArtBox = ({ album }: { album: FullAlbumDetails }) => {
  const [isSideA, setIsSideA] = useState(true);
  const handleFlip = () => setIsSideA((prev) => !prev);

  return (
    <div className={"w-1/2 md:w-1/3 xl:w-1/4 2xl:w-1/5"} onClick={handleFlip}>
        {/* The "card" container that flips */}
      <div className={classNames("transition-transform duration-500 [transform-style:preserve-3d]", {
        ["[transform:rotateY(180deg)]"]: !isSideA
      })}>
        <AlbumCover album={album} />
        <div
          className="absolute top-0 left-0 flex flex-col items-center justify-center w-full h-full bg-brandLightGray p-4
          [backface-visibility:hidden] [transform:rotateY(180deg)]"
        >
          <div>
            <h3 className="text-sm font-bold">
              {album.title}
            </h3>
            <p className={"text-xs"}>{album.artist_name}</p>
            <p className={"text-xs"}>{album.release_year}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
