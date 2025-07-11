"use client"
import React from 'react';
import classNames from 'classnames';

type ButtonDefaultProps = { title: string, label: string, disabled?: boolean, onClick?: () => void }
const MainFilterButton = ({ title, label, disabled = false, onClick }: ButtonDefaultProps) => {
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
    <button 
      title={title} 
      disabled={disabled} 
      onClick={onClick}
      className={classNames(
        'px-7',
        'py-3',
        'rounded-full',
        {
          [comingSoonAfter]: disabled,
          ['bg-gray-300 bg-opacity-50']: disabled,
          ['bg-red-700']: !disabled
        }
      )}
    >
      <p className={classNames('mb-[-6px]', 'text-3xl', {
        ['grayscale opacity-50']: disabled
      })}>
        {label}
      </p>
    </button>
  )
}

export const FilterButtonRow = () => {
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

  return (
    <nav className={'flex flex-row w-full ml-8 content-center'}>
      <MainFilters />
    </nav>
  );
};
