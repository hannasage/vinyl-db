"use client"
import React, { useState, useCallback } from 'react';
import classNames from 'classnames';

const SwitchToggle = ({ enabled, onChange }: { enabled: boolean, onChange: () => void }) => (
  <div className="flex items-center mt-[1.5px]">
    {/* Switch Container */}
    <label className="relative inline-flex items-center cursor-pointer">
      {/* Hidden checkbox input */}
      <input
        type="checkbox"
        className="sr-only peer"
        checked={enabled}
        onChange={onChange}
      />
      {/* The toggle track */}
      <div
        className={`
            w-11 h-6 rounded-full
            transition-colors 
            bg-gray-200
            peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300
            peer-checked:bg-red-700 
            relative
            after:content-['']
            after:absolute 
            after:top-[2px] 
            after:left-[2px]
            after:bg-white
            after:border after:border-gray-300
            after:rounded-full
            after:h-5 
            after:w-5
            after:transition-all
            peer-checked:after:translate-x-full
            peer-checked:after:border-white
          `}
      />
    </label>
  </div>
);


type ButtonDefaultProps = { title: string, label: string, disabled?: boolean }
const MainFilterButton = ({ title, label, disabled = false }: ButtonDefaultProps) => {
  const comingSoonAfter = `
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
    <button title={title} disabled={disabled} className={classNames(
      'px-7',
      'py-3',
      'rounded-full',
      {
        [comingSoonAfter]: disabled,
        ['bg-gray-300 bg-opacity-50']: disabled,
        ['bg-red-700']: !disabled
      })}>
      <p className={classNames('mb-[-6px]', 'text-3xl', {
        ['grayscale opacity-50']: disabled
      })}>
        {label}
      </p>
    </button>
  )
}

const SortButton = ({
  title,
  disabled,
  setActive,
  setOrder,
  noDir = false,
  active = false,
  asc = false
}: Omit<ButtonDefaultProps, 'label'> &
  {
    setActive: () => void,
    setOrder: () => void,
    active?: boolean,
    asc?: boolean
    noDir?: boolean
  }) => {
  const Root = !noDir ? 'button' : 'div';
  const AscDescArrows = () => (
    <div className={classNames('mt-[2px]', 'text-white', {
      ['hidden']: !active || noDir
    })}>
        <span className={classNames({
          ['opacity-50']: !asc && active,
        })}>↑</span>
      <span className={classNames({
        ['opacity-50']: asc && active,
      })}>↓</span>
    </div>
  )
  return (
    <Root
      onClick={!noDir ? () => !active ? setActive() : setOrder() : undefined}
      title={title} disabled={disabled}
      className={classNames(
        'flex',
        'gap-2.5',
        'px-2.5',
        'py-1',
        'rounded-full',
        {
          ['bg-gray-300 bg-opacity-50']: disabled,
          ['bg-red-700']: !disabled && active
        }
      )
    }>
      <p className={classNames('mt-[3px]', 'tracking-wide', {
        ['text-white']: active,
        ['text-red-700 font-semibold']: !active
      })}>{title.toLowerCase()}</p>
      {!noDir ? <AscDescArrows /> : <SwitchToggle enabled onChange={() => {
        return;
      }} />}
    </Root>
  )
}

export const FilterButtonRow = () => {
  const [activeSortType, setActiveSortType] = useState<number>(0);
  const [activeSortDir, setActiveSortDir] = useState<number>(0);
  const isActive = useCallback((i: number) => i == Number(activeSortType), [activeSortType]);
  const isAsc = useCallback(() => activeSortDir === 1, [activeSortDir]);

  type Nav = { title: string, label: string, active: boolean }
  const MAIN_NAV: Nav[] = [
    { title: 'Album', label: '💿', active: true },
    { title: 'Artists', label: '👩🏻‍🎤', active: false }
  ]
  const MainFilters = () => (
    <ul className={'flex flex-row gap-2 my-auto'}>
      {MAIN_NAV.map((s, i) =>
        <li key={`${i}-mainNav`} className={classNames({
          ['relative']: !s.active
        })}>
          <MainFilterButton title={s.title} label={s.label} disabled={!s.active}/>
        </li>
      )}
    </ul>
  );
  type Sort = { title: string, noDir?: boolean }
  const SORT_OPTIONS: Sort[] = [
    // { title: 'Artist' },
    // { title: 'Title' },
    // { title: 'Released' },
    // { title: 'Coming Soon', noDir: true }
  ]
  const SortOptions = () => (
    <ul className={'flex flex-row gap-6 my-auto'}>
      {SORT_OPTIONS.map((s, i) => (
        <li key={`${i}-sortOption`}>
          <SortButton
            title={s.title}
            setActive={() => setActiveSortType(i)}
            setOrder={() => setActiveSortDir(p => p === 0 ? 1 : 0)}
            active={isActive(i)}
            asc={isAsc()}
            noDir={s.noDir}
          />
        </li>
      ))}
    </ul>
  )
  const Divider = () => <div className={'w-[2px] h-full rounded-full bg-gray-300 mx-8'} />;

  return (
    <nav className={'flex flex-row w-full ml-8 content-center'}>
      <MainFilters />
      {SORT_OPTIONS.length !== 0 && <Divider />}
      <SortOptions />
    </nav>
  );
};
