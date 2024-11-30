import React from 'react';
import type { Metadata } from 'next';
import { Anybody } from "next/font/google";
import "./globals.css";
import DotMatrixBackground from '@/components/DotMatrixBackground';
import { LinkBoxBaseProps } from '@/components/boxes';
import { MatrixBox } from '@/components/MatrixBox';

const inter = Anybody({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "some chick's vinyl collection",
  description: "pov: you came over and i've talked your ear off about vinyl, so now you're handed this phone or linked to this page to find one to listen to.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // const title = "vinyl"
  return (
    <html lang="en">
      <body className={inter.className}>
        {/*<h1 className={"absolute top-10 left-4 lg:left-10 z-50 font-black text-manilla text-4xl spacing tracking-tighter"}>*/}
        {/*  {title}*/}
        {/*</h1>*/}
        <nav className={"absolute top-0"}>
          <MatrixBox type={"link"} size={0} props={{
            href: "/v2",
            type: "nav",
            text: "back",
            arrowDirection: "left",
            arrowSide: "left",
            center: true,
          } as LinkBoxBaseProps} />
        </nav>
        {/*<main className={"absolute top-0 bottom-0 left-0 right-0"}>*/}
        <main>
          {children}
        </main>
        <nav className={"absolute bottom-0"}>
          <MatrixBox type={"link"} size={0} props={{
            href: "/v2",
            type: "nav",
          } as LinkBoxBaseProps} />
        </nav>
        {/* TODO: Fix responsive scaling bug w/ dot matrix */}
        {/*<DotMatrixBackground />*/}
      </body>
    </html>
  );
}
