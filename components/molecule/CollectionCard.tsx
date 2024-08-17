import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Collection } from '@/data/types';

export default function CollectionCard({ coverImageUrl, title, id, shortDescription }: Pick<Collection, "coverImageUrl" | "title" | "id" | "shortDescription" >) {
  return (
    <Link href={`/collection/${id}`}>
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
        <div
          className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black via-black/65 to-transparent">
          {/* Text Content */}
          <div className="p-4">
            <h3 className="sm:text-md md:text-lg lg:text-xl font-semibold tracking-tight">{title}</h3>
            <p className={"hidden md:block text-sm text-gray-500 -mt-0.5 italic"}>{shortDescription}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}