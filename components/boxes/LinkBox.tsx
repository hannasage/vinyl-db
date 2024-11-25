import React from 'react';
import Link, { LinkProps } from 'next/link';
import { MatrixBoxBaseProps } from '@/components/MatrixBox';
import classNames from 'classnames';

export type LinkBoxBaseProps = LinkProps & {
  arrowDirection: "up" | "down" | "left" | "right"
  arrowSide: "left" | "right"
  color: "dark" | "light"
  text: string
  type: "nav" | "box"
};

export const LinkBox = ({
  size,
  className,
  color = "dark",
  href,
  text = "Link",
  type = "box"
}: MatrixBoxBaseProps & LinkBoxBaseProps) => {
  return(
    <div className={classNames(className, {
      [`flex`]: type === "nav",
      [`w-[${size}%] h-[${size}%]`]: type === "box",
      ['bg-brandDarkGray']: color === "dark",
      ['bg-brandLightGray']: color === "light",
    })}>
      <Link href={href}>
        {text}
      </Link>
    </div>
  )
}
