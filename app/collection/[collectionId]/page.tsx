import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react';

export default async function Page({ params }: { params: { collectionId: number } }) {
  const sb = createClient()
  const { data, error } = await sb.functions.invoke('get-collection', {
    body: {
      collectionId: params.collectionId
    }
  });
  if (error) redirect('/error')
  return (
    <main className="flex min-h-screen flex-col items-start my-8 mx-2 lg:mx-6">

    </main>
  );
}