import React from 'react';
import {
  AlbumArtBox,
  ButtonBox,
  LinkBox,
  AlbumArtBaseProps,
  ButtonBaseProps,
  LinkBoxBaseProps
} from '@/components/boxes';

interface MatrixBoxProps {
  props: object,
  size: number,
  type: "album" | "button" | "link" | "text",
  className?: string,
}
export type MatrixBoxBaseProps = Pick<MatrixBoxProps, "size" | "className">

/** A switch renderer for the various type of UI boxes available */
export const MatrixBox = ({ type, size, className, props }: MatrixBoxProps) => {

  // TODO: validate props against type requirements

  switch (type) {
    case 'album':
      return <AlbumArtBox size={size} className={className} {...props as AlbumArtBaseProps} />
    case 'button':
      return <ButtonBox size={size} className={className} {...props as ButtonBaseProps} />
    case 'link':
      return <LinkBox size={size} className={className} {...props as LinkBoxBaseProps} />
    case 'text':
    default:
      return <div></div>
  }
}

