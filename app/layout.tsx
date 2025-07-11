import React from 'react';
import type { Metadata } from 'next';
import { Anybody } from "next/font/google";
import DotMatrixBackground from '@/components/ui/DotMatrixBackground';
import FloatingChatProvider from '@/components/chat/FloatingChatProvider';
import "./globals.css";

const inter = Anybody({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "some chick's vinyl collection",
  description: "pov: you came over and i've talked your ear off about vinyl, so now you're handed this phone or linked to this page to find one to listen to.",
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main>
          {children}
        </main>
        {/* TODO: Fix responsive scaling bug w/ dot matrix */}
        <DotMatrixBackground />
        <FloatingChatProvider />
      </body>
    </html>
  );
}
