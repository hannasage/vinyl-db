// @ts-nocheck
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { json } from 'node:stream/consumers';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Query definitions
    const reqData: { albumId: string } = await req.json()
    if (!reqData?.albumId) {
      return new Response("Missing albumId arg", { status: 400 });
    }
    const { data: album, error: albumError } = await supabase
      .from('album')
      .select('*')
      .eq('id', reqData.albumId)
    if (!album?.length) {
      return new Response(`No albums match id ${reqData.albumId}`)
    } else if (albumError) {
      throw albumError
    }
    // Get items from database
    const { data: artist, error: artistError } = await supabase
      .from('artist')
      .select('*')
      .eq('id', album[0].artist_id);
    // Handle potential errors
    // TODO: better define errors
    if (!artist?.length) {
      return new Response(`No artist found for id ${album[0].artist_id}\nAlbum: ${JSON.stringify(album)}`);
    } else if (artistError) {
      throw artistError
    }

    const response = {
      ...album[0],
      artist_name: artist[0].name
    }

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    return new Response(String(err?.message ?? err), { status: 500 })
  }
})