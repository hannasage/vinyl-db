import React from 'react';
import Link from 'next/link';
import classNames from 'classnames';
import { slugify } from '@/utils/slugify';

export type GroupsNavData = {
  activeGroup: string,
  sortOpt: string | undefined,
  order: string | undefined
}

const GroupLink = ({
  title,
  label,
  active = false,
  _underConstruction = false
}: {
  title: string,
  label: string,
  active: boolean,
  _underConstruction?: boolean
}) => {
  const Root = _underConstruction ? 'div' : Link
  const soon = `
      after:opacity-100 
      after:absolute 
      after:top-[-8px]
      after:left-14
      after:content-['🔜'] 
      after:text-[18px] 
      after:text-white 
      after:bg-amber-400
      after:px-2
      after:py-0.5
      after:pt-1.5
      after:rounded-full
      after:drop-shadow-md
    `
  return (
    <Root href={`/${title.toLowerCase()}`} title={title} className={classNames(
      'block',
      'px-7',
      'py-3',
      'rounded-full',
      {
        [soon]: _underConstruction,
        ['bg-gray-300 bg-opacity-50']: _underConstruction,
        ['bg-red-700']: !_underConstruction && active
      })}>
      <p className={classNames('mb-[-6px]', 'text-3xl', 'select-none', {
        ['grayscale opacity-50']: _underConstruction
      })}>
        {label}
      </p>
    </Root>
  )
}

const SortLink = ({
  title,
  parentUri,
  active
}: {
  title: string,
  parentUri: string,
  active: boolean,
}) => {
  return (
    <Link
      href={`/${slugify(parentUri)}/${slugify(title)}`}
      title={title}
      className={classNames(
        'flex',
        'gap-2.5',
        'px-2.5',
        'py-1',
        'rounded-full',
        {
          ['bg-red-700']: active
        }
      )
    }>
      <p className={classNames('mt-[3px]', 'tracking-wide', 'select-none', {
        ['text-white']: active
      })}>
        {title.toLowerCase()}
      </p>
    </Link>
  )
}

export const GroupsAndSorting = ({ navData }: { navData: GroupsNavData }) => {
  type Nav = { title: string, label: string, _underConstruction: boolean }
  const MAIN_NAV: Nav[] = [
    { title: 'Albums', label: '💿', _underConstruction: true },
    { title: 'Artists', label: '👩🏻‍🎤', _underConstruction: false }
  ]
  const Groups = () => (
    <ul className={'flex flex-row gap-2 my-auto'}>
      {MAIN_NAV.map((s, i) =>
        <li key={`${i}-mainNav`} className={classNames({
          ['relative']: !s._underConstruction
        })}>
          <GroupLink
            title={s.title}
            label={s.label}
            active={navData.activeGroup === s.title.toLowerCase()}
            _underConstruction={!s._underConstruction}
          />
        </li>
      )}
    </ul>
  );
  type Sort = { title: string }
  const SORT_OPTIONS: Sort[] = [
    { title: 'Artist' },
    { title: 'Title' },
    { title: 'Released' },
    { title: 'Coming Soon' }
  ]
  const SortOptions = () => (
    <ul className={'flex flex-row gap-6 my-auto'}>
      {SORT_OPTIONS.map((s, i) => (
        <li key={`${i}-sortOption`}>
          <SortLink
            title={s.title}
            parentUri={navData.activeGroup}
            active={navData.sortOpt === slugify(s.title)}
          />
        </li>
      ))}
    </ul>
  )
  const Divider = () => <div className={'w-[2px] h-full rounded-full bg-gray-300 mx-8'} />;

  return (
    <nav className={'flex flex-row w-full ml-8 content-center'}>
      <Groups />
      {SORT_OPTIONS.length !== 0 && <Divider />}
      <SortOptions />
    </nav>
  );
};
