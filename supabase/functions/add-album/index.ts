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
    const { albumName, artistName, releaseYear, variant, purchaseDate, acquiredDate, preordered, artworkUrl, size } = requestData;
    
    console.log(`[add-album] Request: albumName="${albumName}", artistName="${artistName}", releaseYear=${releaseYear}, variant="${variant}"`);
    
    // Validate required parameters
    if (!albumName || !artistName) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters',
        message: 'Both albumName and artistName are required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Check if artist already exists
    let { data: existingArtists, error: artistQueryError } = await supabase
      .from('artist')
      .select('id, name')
      .ilike('name', artistName);

    if (artistQueryError) {
      console.error(`[add-album] Error querying artist:`, artistQueryError);
      throw artistQueryError;
    }

    let artistId;

    if (existingArtists && existingArtists.length > 0) {
      // Use existing artist (take the first match)
      artistId = existingArtists[0].id;
      console.log(`[add-album] Using existing artist: "${existingArtists[0].name}" (ID: ${artistId})`);
    } else {
      // Create new artist
      const { data: newArtist, error: artistCreateError } = await supabase
        .from('artist')
        .insert([{ name: artistName }])
        .select('id, name')
        .single();

      if (artistCreateError) {
        console.error(`[add-album] Error creating artist:`, artistCreateError);
        throw artistCreateError;
      }

      artistId = newArtist.id;
      console.log(`[add-album] Created new artist: "${newArtist.name}" (ID: ${artistId})`);
    }

    // Prepare album data
    const albumData = {
      title: albumName,
      artist_id: artistId,
      release_year: releaseYear || null,
      variant: variant || null,
      purchase_date: purchaseDate || null,
      acquired_date: acquiredDate || new Date().toISOString().split('T')[0], // Default to today
      preordered: preordered || false,
      artwork_url: artworkUrl || null,
      size: size || 12 // Default to 12"
    };

    console.log(`[add-album] Creating album: "${albumName}" (Artist ID: ${artistId})`);

    // Create the album
    const { data: newAlbum, error: albumCreateError } = await supabase
      .from('album')
      .insert([albumData])
      .select(`
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
      `)
      .single();

    if (albumCreateError) {
      console.error(`[add-album] Error creating album:`, albumCreateError);
      throw albumCreateError;
    }

    console.log(`[add-album] Album created successfully (ID: ${newAlbum.id})`);

    // Get the artist name for the response
    const { data: artist, error: artistError } = await supabase
      .from('artist')
      .select('name')
      .eq('id', artistId)
      .single();

    if (artistError) {
      console.error(`[add-album] Error fetching artist name:`, artistError);
      throw artistError;
    }

    const response = {
      ...newAlbum,
      artist_name: artist.name
    };

    const successMessage = `Successfully added "${albumName}" by ${artistName} to your collection`;
    console.log(`[add-album] Operation completed: ${successMessage}`);

    return new Response(JSON.stringify({
      success: true,
      message: successMessage,
      album: response
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (err) {
    console.error('[add-album] Error:', err);
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