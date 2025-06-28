import React from 'react';
import ChatInterface from '../../../components/ChatInterface';

export default async function Page() {
  return (
    <main className="flex min-h-screen flex-col items-start">
      <ChatInterface />
    </main>
  );
}