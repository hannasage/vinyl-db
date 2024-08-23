import React from 'react';
import NewestAlbumsScroller from '@/components/organism/NewestAlbumsScroller';
import CollectionGrid from '@/components/organism/CollectionGrid';
import classNames from 'classnames';

export default async function Page() {
  return (
    <div className={classNames('flex',
      'min-h-screen',
      'flex-col',
      'items-start',
      'my-8'
    )}>
      <NewestAlbumsScroller />
      <CollectionGrid />
    </div>
  );
}