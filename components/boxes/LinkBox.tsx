import React from 'react';
import Link, { LinkProps } from 'next/link';
import { MatrixBoxBaseProps } from '@/components/MatrixBox';
import classNames from 'classnames';

export type LinkBoxBaseProps = LinkProps & {
  arrowDirection: "up" | "down" | "left" | "right"
  arrowSide: "left" | "right"
  center: boolean,
  color: "dark" | "light"
  text: string
  type: "nav" | "box"
};

export const LinkBox = ({
  size,
  arrowSide,
  arrowDirection,
  center,
  className,
  color = "dark",
  href,
  text = "Link",
  type = "box"
}: MatrixBoxBaseProps & LinkBoxBaseProps) => {
  const arrows: Record<LinkBoxBaseProps["arrowDirection"], string> = {
    right: "→",
    left: "←",
    up: "↑",
    down: "↓"
  }
  const Arrow = () => (
    <span className={classNames({
      ["mr-4"]: arrowSide === "left",
      ["ml-4"]: arrowSide === "right"
    })}>
      {arrows[arrowDirection]}
    </span>
  );
  return (
    <div className={classNames(className, "no-underline", {
      [`flex w-[100vw] p-6 text-white text-3xl tracking-wide`]: type === "nav",
      ['justify-center align-middle']: center,
      [`w-[${size}%] h-[${size}%]`]: type === "box",
      ['bg-brandDarkGray']: color === "dark",
      ['bg-brandLightGray']: color === "light",
    })}>
      <Link href={href}>
        {arrowSide === "left" && <Arrow />}
        {text}
        {arrowSide === "right" && <Arrow />}
      </Link>
    </div>
  )
}
