import React from 'react';
import { AlbumArt, AlbumArtBaseProps } from '@/components/atom/AlbumArt';
import { Button, ButtonBaseProps } from '@/components/atom/Button';

interface MatrixBoxProps<T> {
  props: T
  size: number,
  type: "album" | "button" | "link" | "text",
  className?: string,
}
export type MatrixBoxBaseProps = Pick<MatrixBoxProps<any>, "size" | "className">

/** A switch renderer for the various type of UI boxes available */
export const MatrixBox = <T,>({ type, size, className, props }: MatrixBoxProps<T>) => {

  // TODO: validate props against type requirements

  switch (type) {
    case 'album':
      return <AlbumArt size={size} className={className} {...props as AlbumArtBaseProps} />
    case 'button':
      return <Button size={size} className={className} {...props as ButtonBaseProps} />
    case 'link':
    case 'text':
    default:
      return <div></div>
  }
}

