import React from 'react';
import type { Metadata } from 'next';
import { Anybody } from "next/font/google";
import DotMatrixBackground from '@/components/DotMatrixBackground';
import "../../globals.css";
import { Navigation } from '@/components/Navigation';

const inter = Anybody({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "some chick's vinyl collection",
  description: "pov: you came over and i've talked your ear off about vinyl, so now you're handed this phone or linked to this page to find one to listen to.",
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ group: string, slug: string [] }>;
}>) {
  const { group, slug } = await params;
  const navData = slug.length ? {
    activeGroup: group,
    sortOpt: slug[0],
    order: slug?.[1],
  } : {
    activeGroup: group,
    sortOpt: undefined,
    order: undefined,
  }
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navigation data={navData} />
        <main>
          {children}
        </main>
        {/* TODO: Fix responsive scaling bug w/ dot matrix */}
        <DotMatrixBackground />
      </body>
    </html>
  );
}
