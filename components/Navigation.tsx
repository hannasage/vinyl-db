
import React from 'react';
import { SORTED_PAGES } from '@/data/filters';
import { ListLink } from '@/components/atom/ListLink';
import { createClient } from '@/utils/supabase/server';

export default async function Navigation() {
  const sb = createClient()
  const { data: userData } = await sb.auth.getUser()
  return (
    <ul className={'mt-6 ml-2 lg:ml-6'}>
      {SORTED_PAGES.map((pn, idx) => (
        <ListLink key={idx} slug={`/browse/${pn.slug}`} label={pn.label} />
      ))}
      {userData?.user && <ListLink slug={'/admin'} label={'manage'} />}
    </ul>
  );
}
