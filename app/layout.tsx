import React from 'react';
import type { Metadata } from 'next';
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from '@/components/molecule/Navigation';

const inter = Inter({ subsets: ["latin"] });

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
        <nav>
          <Navigation />
        </nav>
        <main className={"absolute left-0 right-0 top-0 bottom-0"}>
          {children}
        </main>
      </body>
    </html>
  );
}
