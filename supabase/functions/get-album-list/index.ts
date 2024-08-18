// @ts-nocheck
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Query definitions
    const reqData: { list: string } = await req.json()
    const listOptions = {
      newest: await supabase
        .from('album')
        .select('*')
        .gte('acquired_date', new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString())
        .lte('acquired_date', new Date(Date.now()).toISOString()),
      all: await supabase.from('album').select('*')
    }

    // Get items from database
    const { data: artists, error: artistError } = await supabase.from('artist').select('*');
    const { data: albums, error: albumError } = listOptions[reqData.list]
    // Handle potential errors
    // TODO: better define errors
    if (artistError) throw artistError;
    if (albumError) throw albumError;
    if (!artists?.length || !albums?.length)
      console.error("data missing error\n", "artists: ", artists, "\nalbums: ", albums)

    // Create a map of artist_id to artist details for easy lookup
    const artistMap = artists.reduce((acc: Record<number, any>, artist) => {
      acc[artist.id] = artist.name
      return acc
    }, {})

    const sortOptions = {
      newest: (l: Album[]) => l.sort((albumA, albumB) =>
        new Date(albumB.acquired_date).getTime() - new Date(albumA.acquired_date).getTime()
      ),
      // TODO: Move the rest of sorting to back-end
      all: (l: Album[]) => l
    }

    let list = albums?.map((album) => ({
      ...album,
      artist_name: artistMap[album.artist_id]
    }));
    list = sortOptions[reqData.list](list); // apply dynamic sort

    return new Response(JSON.stringify({ list }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    return new Response(String(err?.message ?? err), { status: 500 })
  }
})