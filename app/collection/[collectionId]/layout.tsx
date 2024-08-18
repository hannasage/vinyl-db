import Link from 'next/link';
import React, { PropsWithChildren } from 'react';
import classNames from 'classnames';

export default function Layout({ children }: PropsWithChildren) {
  return (
    <>
      <div className={classNames(
        "absolute top-1/3 left-0 right-0 w-full max-w-screen-lg",
        "mx-auto",
        "px-4",
      )}>
        <Link className={classNames(
          "bg-gradient-to-br from-red-500 to-purple-500",
          "drop-shadow-glowPurple",
          "px-6 py-3",
          "text-white",
          "font-semibold",
          "rounded-full"
        )} href={"/"}>Back</Link>
      </div>
      {children}
    </>

  )
}
