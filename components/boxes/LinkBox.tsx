import React from 'react';
import Link, { LinkProps } from 'next/link';
import { MatrixBoxBaseProps } from '@/components/MatrixBox';
import classNames from 'classnames';

export type LinkBoxBaseProps = LinkProps;

export const LinkBox = ({ size, className, href }: MatrixBoxBaseProps & LinkBoxBaseProps) => {
  return(
    <Link href={href} className={classNames(className, `w-[${size}%] h-[${size}%]`)}>

    </Link>
  )
}
