import React from 'react';
import Image from 'next/image';
import { Collection } from '@/data/types';

// w-full md:w-[45%] lg:w-[20%]
export default function CollectionCard({ coverImageUrl, title, shortDescription }: Pick<Collection, "coverImageUrl" | "title" | "shortDescription">) {
  return (
    <div className="relative rounded-lg overflow-hidden shadow-lg bg-gray-900 w-full">
      {/* Cover Image */}
      <div className="relative w-full h-auto">
        <Image
          src={coverImageUrl || ""}
          alt={title}
          width={1000} // set width as a ratio value
          height={1500} // set height as a ratio value to allow for varying heights
          className="rounded-t-lg object-contain"
        />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black via-black/65 to-transparent">
        {/* Text Content */}
        <div className="p-4">
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          <p className="text-sm mt-1 text-gray-400">{shortDescription}</p>
        </div>
      </div>
    </div>
  );
}