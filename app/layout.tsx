import React from 'react';
import type { Metadata } from 'next';
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from '@/components/molecule/Navigation';
import { stringToColor } from '@/utils/color/stringToColor';

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
  const title = "vinyl"
  return (
    <html lang="en">
      <body className={inter.className}>
        <h1 className={"mt-6 ml-4 lg:ml-6 font-black text-3xl spacing tracking-tighter"}>
          {title}
        </h1>
        <nav>
          <Navigation />
        </nav>
        {children}
      </body>
    </html>
  );
}
