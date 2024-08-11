// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: collections, error: collectionsError } = await supabase.from('collection').select('*');
    if (collectionsError) throw artistError;
    if (!collections?.length)
      console.error("data missing error\n", "artists: ", artists, "\nalbums: ", albums)

    return new Response(JSON.stringify({ collections }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    return new Response(String(err?.message ?? err), { status: 500 })
  }
})
