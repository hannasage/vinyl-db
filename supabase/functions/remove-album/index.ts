// @ts-nocheck
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    console.log('[remove-album] Starting request processing');
    
    // Handle CORS
    if (req.method === 'OPTIONS') {
      console.log('[remove-album] Handling CORS preflight request');
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
      console.log(`[remove-album] Invalid method: ${req.method}`);
      return new Response('Method not allowed', {
        status: 405,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        }
      });
    }

    console.log('[remove-album] Creating Supabase client');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the request body
    console.log('[remove-album] Parsing request body');
    const requestData = await req.json().catch(() => ({}));
    console.log('[remove-album] Request data:', requestData);
    
    const { albumId, albumName, artistName } = requestData;

    // Validate input - require either albumId or albumName
    if (!albumId && !albumName) {
      console.log('[remove-album] Validation failed: missing albumId or albumName');
      return new Response(JSON.stringify({
        error: 'Missing required parameters',
        message: 'Provide albumId or albumName (artistName is optional).'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    console.log(`[remove-album] Input validation passed. albumId: ${albumId}, albumName: ${albumName}, artistName: ${artistName}`);

    // Find the album to delete
    let album;
    if (albumId) {
      console.log(`[remove-album] Searching by albumId: ${albumId}`);
      const { data, error } = await supabase
        .from('album')
        .select('id, title, artist_id')
        .eq('id', albumId)
        .single();
      
      console.log(`[remove-album] Album search result:`, { data, error });
      
      if (error || !data) {
        console.log(`[remove-album] No album found with id ${albumId}`);
        return new Response(JSON.stringify({
          success: false,
          message: `No album found with id ${albumId}`
        }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        });
      }
      album = data;
      console.log(`[remove-album] Found album by ID:`, album);
    } else {
      console.log(`[remove-album] Searching by albumName: ${albumName}`);
      
      // Find album by title, with optional artist filtering
      let query = supabase
        .from('album')
        .select('id, title, artist_id, artist(name)')
        .ilike('title', albumName);
      
      if (artistName) {
        console.log(`[remove-album] Artist name provided: ${artistName}, filtering by artist`);
        // If artist name is provided, filter by artist
        const { data: artists, error: artistError } = await supabase
          .from('artist')
          .select('id')
          .ilike('name', artistName);
        
        console.log(`[remove-album] Artist search result:`, { artists, artistError });
        
        if (artistError || !artists?.length) {
          console.log(`[remove-album] No artist found matching "${artistName}"`);
          return new Response(JSON.stringify({
            success: false,
            message: `No artist found matching "${artistName}"`
          }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            }
          });
        }
        const artistId = artists[0].id;
        console.log(`[remove-album] Found artist ID: ${artistId}, filtering query`);
        query = query.eq('artist_id', artistId);
      }
      
      const { data: albums, error: albumError } = await query;
      console.log(`[remove-album] Album search result:`, { albums, albumError });
      
      if (albumError || !albums?.length) {
        const errorMessage = artistName 
          ? `No album found with title "${albumName}" for artist "${artistName}"`
          : `No album found with title "${albumName}"`;
        console.log(`[remove-album] ${errorMessage}`);
        return new Response(JSON.stringify({
          success: false,
          message: errorMessage
        }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        });
      }
      
      // If multiple albums found and no artist specified, return list of options
      if (albums.length > 1 && !artistName) {
        const albumOptions = albums.map(a => `"${a.title}" by ${a.artist?.name || 'Unknown Artist'}`).join(', ');
        console.log(`[remove-album] Multiple albums found: ${albumOptions}`);
        return new Response(JSON.stringify({
          success: false,
          message: `Multiple albums found with title "${albumName}". Please specify the artist. Options: ${albumOptions}`,
          options: albums.map(a => ({ id: a.id, title: a.title, artist: a.artist?.name }))
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        });
      }
      
      album = albums[0];
      console.log(`[remove-album] Selected album:`, album);
    }

    console.log(`[remove-album] About to delete album:`, album);

    // First, delete any related entries that reference this album
    console.log(`[remove-album] Checking for related entries`);
    const { data: relatedEntries, error: entriesError } = await supabase
      .from('entry')
      .select('id')
      .eq('albumId', album.id);
    
    console.log(`[remove-album] Related entries check:`, { relatedEntries, entriesError });
    
    if (entriesError) {
      console.error(`[remove-album] Error checking related entries:`, entriesError);
      throw entriesError;
    }
    
    if (relatedEntries && relatedEntries.length > 0) {
      console.log(`[remove-album] Found ${relatedEntries.length} related entries, deleting them first`);
      const { error: deleteEntriesError } = await supabase
        .from('entry')
        .delete()
        .eq('albumId', album.id);
      
      console.log(`[remove-album] Delete entries result:`, { deleteEntriesError });
      
      if (deleteEntriesError) {
        console.error(`[remove-album] Error deleting related entries:`, deleteEntriesError);
        throw deleteEntriesError;
      }
    } else {
      console.log(`[remove-album] No related entries found`);
    }

    // Delete the album
    const { error: deleteError } = await supabase
      .from('album')
      .delete()
      .eq('id', album.id);
    
    console.log(`[remove-album] Delete operation result:`, { deleteError });
    
    if (deleteError) {
      console.error(`[remove-album] Delete error:`, deleteError);
      throw deleteError;
    }

    console.log(`[remove-album] Album deleted successfully, checking for orphaned artist`);

    // Check if the artist is now orphaned (no more albums)
    const { data: remainingAlbums, error: checkError } = await supabase
      .from('album')
      .select('id')
      .eq('artist_id', album.artist_id);
    
    console.log(`[remove-album] Remaining albums check:`, { remainingAlbums, checkError });
    
    if (checkError) {
      console.error(`[remove-album] Error checking remaining albums:`, checkError);
      throw checkError;
    }
    
    if (!remainingAlbums || remainingAlbums.length === 0) {
      console.log(`[remove-album] Artist is orphaned, deleting artist ID: ${album.artist_id}`);
      // Delete the artist
      const { error: artistDeleteError } = await supabase
        .from('artist')
        .delete()
        .eq('id', album.artist_id);
      
      console.log(`[remove-album] Artist delete result:`, { artistDeleteError });
      
      if (artistDeleteError) {
        console.error(`[remove-album] Error deleting orphaned artist:`, artistDeleteError);
        // Don't throw here, as the album was already deleted successfully
      }
    } else {
      console.log(`[remove-album] Artist still has ${remainingAlbums.length} albums, not deleting artist`);
    }

    const responseMessage = `Successfully removed album "${album.title}" (ID: ${album.id})`;
    console.log(`[remove-album] Operation completed successfully: ${responseMessage}`);

    return new Response(JSON.stringify({
      success: true,
      message: responseMessage,
      albumId: album.id
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (err) {
    console.error('[remove-album] Error in remove-album:', err);
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