import React from 'react';
import { ListLink } from '@/components/atom/ListLink';
import { createClient } from '@/utils/supabase/server';
import { signOut } from '@/utils/supabase/auth';

export default async function Navigation() {
  const sb = createClient()
  const { data: userData } = await sb.auth.getUser()
  return (
    <ul className={'mt-6 ml-2 lg:ml-6'}>
      {userData?.user && (
        <>
          <ListLink slug={'/admin'} label={'manage'} className={"mt-10 text-sm"} />
          <form>
            <button className={"text-sm"} formAction={signOut}>signout</button>
          </form>
        </>
      )}
    </ul>
  );
}
