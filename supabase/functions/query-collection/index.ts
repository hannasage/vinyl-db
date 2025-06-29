// @ts-nocheck
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the request body
    const requestData = await req.json().catch(() => ({}));
    const { albumName, artistName } = requestData;
    
    // Validate that at least one parameter is provided
    if (!albumName && !artistName) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters',
        message: 'At least one of albumName or artistName is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    let query = supabase.from('album').select(`
      id,
      title,
      artist_id,
      variant,
      purchase_date,
      acquired_date,
      preordered,
      artwork_url,
      release_year,
      size
    `);

    // If artist name is provided, filter by artist
    if (artistName) {
      // First get artist IDs that match the name
      const { data: artists, error: artistError } = await supabase
        .from('artist')
        .select('id, name')
        .ilike('name', `%${artistName}%`);

      if (artistError) {
        throw artistError;
      }

      if (!artists || artists.length === 0) {
        return new Response(JSON.stringify({
          found: false,
          message: `No artist found matching "${artistName}"`,
          albumName: albumName || null,
          artistName
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        });
      }

      const artistIds = artists.map(artist => artist.id);
      query = query.in('artist_id', artistIds);
    }

    // If album name is provided, filter by album title
    if (albumName) {
      query = query.ilike('title', `%${albumName}%`);
    }

    // Execute the query
    const { data: albums, error: albumError } = await query;

    if (albumError) {
      throw albumError;
    }

    if (!albums || albums.length === 0) {
      let message = '';
      if (albumName && artistName) {
        message = `No album "${albumName}" found for artist "${artistName}"`;
      } else if (albumName) {
        message = `No album found matching "${albumName}"`;
      } else if (artistName) {
        message = `No albums found for artist "${artistName}"`;
      }
      
      return new Response(JSON.stringify({
        found: false,
        message,
        albumName: albumName || null,
        artistName: artistName || null
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Get artist information for all albums
    const artistIds = [...new Set(albums.map(album => album.artist_id))];
    const { data: artists, error: artistsError } = await supabase
      .from('artist')
      .select('id, name')
      .in('id', artistIds);

    if (artistsError) {
      throw artistsError;
    }

    // Create artist lookup map
    const artistMap = artists.reduce((acc, artist) => {
      acc[artist.id] = artist.name;
      return acc;
    }, {});

    // Return the found album(s) with artist information
    const results = albums.map(album => ({
      ...album,
      artist_name: artistMap[album.artist_id] || 'Unknown Artist'
    }));

    // Generate appropriate message based on query type
    let message = '';
    if (albumName && artistName) {
      message = `Found ${results.length} album(s) matching "${albumName}" by "${artistName}"`;
    } else if (albumName) {
      message = `Found ${results.length} album(s) matching "${albumName}"`;
    } else if (artistName) {
      message = `Found ${results.length} album(s) by "${artistName}"`;
    }

    return new Response(JSON.stringify({
      found: true,
      message,
      albums: results,
      albumName: albumName || null,
      artistName: artistName || null
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (err) {
    console.error('Error in query-collection:', err);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: err?.message || 'Unknown error'
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}); 