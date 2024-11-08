import React from 'react';
import { AlbumArt } from '@/components/atom/AlbumArt';

const album = {
  artwork_url: "https://dwnodxgkqevbqfkfyggd.supabase.co/storage/v1/object/public/artwork/soccermommy-evergreen.jpeg",
  title: "Evergreen",
  artist_name: "Soccer Mommy"
}

export default async function Page() {
  return (
    <div>
      <AlbumArt {...album} size={500} />
    </div>
  );
}