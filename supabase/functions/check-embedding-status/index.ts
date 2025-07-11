import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      }
    });
  }

  try {
    // Initialize Supabase client with user authentication
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

    // Get total counts
    const { count: totalAlbums, error: albumsCountError } = await supabase
      .from('album')
      .select('*', { count: 'exact', head: true });

    if (albumsCountError) {
      throw albumsCountError;
    }

    const { count: totalArtists, error: artistsCountError } = await supabase
      .from('artist')
      .select('*', { count: 'exact', head: true });

    if (artistsCountError) {
      throw artistsCountError;
    }

    // Get albums without embeddings
    const { data: albumsWithoutEmbeddings, error: albumsError } = await supabase
      .rpc('get_albums_without_embeddings', { limit_count: 1000 }); // Large limit to get all

    if (albumsError) {
      throw albumsError;
    }

    // Get artists without embeddings
    const { data: artistsWithoutEmbeddings, error: artistsError } = await supabase
      .rpc('get_artists_without_embeddings', { limit_count: 1000 }); // Large limit to get all

    if (artistsError) {
      throw artistsError;
    }

    const albumsWithEmbeddings = (totalAlbums || 0) - (albumsWithoutEmbeddings?.length || 0);
    const artistsWithEmbeddings = (totalArtists || 0) - (artistsWithoutEmbeddings?.length || 0);

    const status = {
      albums: {
        total: totalAlbums || 0,
        withEmbeddings: albumsWithEmbeddings,
        withoutEmbeddings: albumsWithoutEmbeddings?.length || 0,
        complete: albumsWithEmbeddings === (totalAlbums || 0)
      },
      artists: {
        total: totalArtists || 0,
        withEmbeddings: artistsWithEmbeddings,
        withoutEmbeddings: artistsWithoutEmbeddings?.length || 0,
        complete: artistsWithEmbeddings === (totalArtists || 0)
      },
      overall: {
        complete: albumsWithEmbeddings === (totalAlbums || 0) && artistsWithEmbeddings === (totalArtists || 0)
      }
    };

    return new Response(
      JSON.stringify(status),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Check embedding status error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}); 