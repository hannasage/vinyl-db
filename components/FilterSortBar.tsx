import React from 'react';
import { FilterButtonRow } from '@/components/FilterButtonRow';

const TITLE = "vinyl"
export const FilterSortBar = () => (
  <div className={'flex w-screen bg-brandLightGray drop-shadow-lg p-3 sticky'}>
    <h1 className={'ml-16 py-5 my-auto font-normal text-4xl spacing text-red-700'}>
      {TITLE}
    </h1>
    <FilterButtonRow />
  </div>
);