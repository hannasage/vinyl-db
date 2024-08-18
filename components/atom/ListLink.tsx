"use client"
import { usePathname } from 'next/navigation';
import { stringToColor } from '@/utils/color/stringToColor';
import classNames from 'classnames';
import Link from 'next/link';
import React from 'react';

export const ListLink = ({ slug, label, className }: {
  slug: string,
  label: string,
  className?: string
}) => {
  const getFilter = (s: string) => {
    const split = s.split('/');
    return split[split.length - 1];
  }
  const pathname = usePathname()
  const pathFilter = getFilter(pathname)
  const slugFilter = getFilter(slug);
  const style = {
    color: stringToColor(slugFilter, "first") // name of filter
  }
  return (
    <li style={pathFilter === slugFilter ? style : {}} className={classNames('leading-8', 'text-3xl', className)}>
      <Link href={slug}>
        {label}
      </Link>
    </li>
  );
}
