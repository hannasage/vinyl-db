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

    // Add explicit authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: 'Authentication required'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Get the request body
    const requestData = await req.json().catch(() => ({}));
    const { albumId, albumName, artistName } = requestData;

    console.log(`[remove-album] Request: albumId=${albumId}, albumName=${albumName}, artistName=${artistName}`);

    // Validate input - require either albumId or albumName
    if (!albumId && !albumName) {
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

    // Find the album to delete
    let album;
    if (albumId) {
      const { data, error } = await supabase
        .from('album')
        .select('id, title, artist_id')
        .eq('id', albumId)
        .single();
      
      if (error || !data) {
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
    } else {
      // Find album by title, with optional artist filtering
      let query = supabase
        .from('album')
        .select('id, title, artist_id, artist(name)')
        .ilike('title', albumName);
      
      if (artistName) {
        // If artist name is provided, filter by artist
        const { data: artists, error: artistError } = await supabase
          .from('artist')
          .select('id')
          .ilike('name', artistName);
        
        if (artistError || !artists?.length) {
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
        query = query.eq('artist_id', artistId);
      }
      
      const { data: albums, error: albumError } = await query;
      
      if (albumError || !albums?.length) {
        const errorMessage = artistName 
          ? `No album found with title "${albumName}" for artist "${artistName}"`
          : `No album found with title "${albumName}"`;
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
    }

    console.log(`[remove-album] Found album: "${album.title}" (ID: ${album.id})`);

    // First, delete any related entries that reference this album
    const { data: relatedEntries, error: entriesError } = await supabase
      .from('entry')
      .select('id')
      .eq('albumId', album.id);
    
    if (entriesError) {
      console.error(`[remove-album] Error checking related entries:`, entriesError);
      throw entriesError;
    }
    
    if (relatedEntries && relatedEntries.length > 0) {
      console.log(`[remove-album] Deleting ${relatedEntries.length} related entries`);
      const { error: deleteEntriesError } = await supabase
        .from('entry')
        .delete()
        .eq('albumId', album.id);
      
      if (deleteEntriesError) {
        console.error(`[remove-album] Error deleting related entries:`, deleteEntriesError);
        throw deleteEntriesError;
      }
    }

    // Delete the album
    const { error: deleteError } = await supabase
      .from('album')
      .delete()
      .eq('id', album.id);
    
    if (deleteError) {
      console.error(`[remove-album] Delete error:`, deleteError);
      throw deleteError;
    }

    console.log(`[remove-album] Album deleted successfully`);

    // Check if the artist is now orphaned (no more albums)
    const { data: remainingAlbums, error: checkError } = await supabase
      .from('album')
      .select('id')
      .eq('artist_id', album.artist_id);
    
    if (checkError) {
      console.error(`[remove-album] Error checking remaining albums:`, checkError);
      throw checkError;
    }
    
    if (!remainingAlbums || remainingAlbums.length === 0) {
      console.log(`[remove-album] Deleting orphaned artist (ID: ${album.artist_id})`);
      // Delete the artist
      const { error: artistDeleteError } = await supabase
        .from('artist')
        .delete()
        .eq('id', album.artist_id);
      
      if (artistDeleteError) {
        console.error(`[remove-album] Error deleting orphaned artist:`, artistDeleteError);
        // Don't throw here, as the album was already deleted successfully
      }
    }

    const responseMessage = `Successfully removed album "${album.title}" (ID: ${album.id})`;
    console.log(`[remove-album] Operation completed: ${responseMessage}`);

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
    console.error('[remove-album] Error:', err);
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