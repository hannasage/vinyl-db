// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const reqData: { collectionId: number } = await req.json()
    if (!reqData.collectionId) {
      console.error(`malformed request error\n`, `request data: ${reqData}`)
      return new Response('No collectionId given', { status: 400 });
    }

    const { data: collection, error: collectionError } = await supabase
      .from('collection')
      .select('*')
      .eq('id', reqData.collectionId);
    const { data: entries, error: entriesError } = await supabase
      .from('entry')
      .select('*')
      .eq('collectionId', reqData.collectionId);
    if (!collection?.length || collectionError) {
      console.error('Collection data missing error\n', 'collections: ', collection, 'error: ', collectionError);
      return new Response(`No collection found for id ${reqData.collectionId}`, { status: 404 });
    } else if (!entries?.length || entriesError) {
      console.error('Entry data missing error\n', 'entries: ', entries, 'error: ', entriesError);
      return new Response(`No entries found for id ${reqData.collectionId}`, { status: 404 });
    }

    return new Response(JSON.stringify({
      meta: {
        ...collection[0]
      },
      entries: entries
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    return new Response(String(err?.message ?? err), { status: 500 })
  }
})
