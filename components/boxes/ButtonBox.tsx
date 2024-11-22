import React from 'react';
import { MatrixBoxBaseProps } from '@/components/MatrixBox';
import classNames from 'classnames';

export interface ButtonBaseProps {}

export const ButtonBox = ({ size, className }: MatrixBoxBaseProps & ButtonBaseProps) => {
  return(
    <button className={classNames(className, `w-[${size}%] h-[${size}%]`)}>

    </button>
  )
}
