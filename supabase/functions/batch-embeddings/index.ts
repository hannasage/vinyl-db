import { createClient } from 'jsr:@supabase/supabase-js@2'
import { OpenAI } from 'jsr:@openai/openai@4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BatchEmbeddingsRequest {
  type?: 'albums' | 'artists' | 'all';
  limit?: number;
  offset?: number;
}

async function generateEmbedding(text: string, openai: OpenAI): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  
  return response.data[0].embedding;
}

async function generateAlbumEmbeddings(albumId: number, supabase: any, openai: OpenAI): Promise<void> {
  try {
    // Get album and artist data
    const { data: albumData, error: albumError } = await supabase
      .from('album')
      .select(`
        title,
        release_year,
        purchase_date,
        acquired_date,
        artist:artist_id(name)
      `)
      .eq('id', albumId)
      .single();
    
    if (albumError) {
      console.error(`Error fetching album ${albumId}:`, albumError);
      throw albumError;
    }
    
    const { title, release_year, purchase_date, acquired_date, artist } = albumData;
    const artistName = artist.name;
    
    // Generate text representations
    const combinedText = `${title} by ${artistName}`;
    
    let temporalText = `${title} by ${artistName}`;
    if (release_year) temporalText += ` released in ${release_year}`;
    if (purchase_date) temporalText += ` purchased ${purchase_date}`;
    if (acquired_date) temporalText += ` received ${acquired_date}`;
    
    // Generate embeddings
    const [titleEmbedding, artistEmbedding, combinedEmbedding, temporalEmbedding] = await Promise.all([
      generateEmbedding(title, openai),
      generateEmbedding(artistName, openai),
      generateEmbedding(combinedText, openai),
      generateEmbedding(temporalText, openai)
    ]);
    
    // Store embeddings
    const { error: insertError } = await supabase
      .from('album_embeddings')
      .upsert({
        album_id: albumId,
        title_embedding: titleEmbedding,
        artist_embedding: artistEmbedding,
        combined_embedding: combinedEmbedding,
        temporal_embedding: temporalEmbedding,
        updated_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.error(`Error storing embeddings for album ${albumId}:`, insertError);
      throw insertError;
    }
    
    console.log(`Generated embeddings for album: ${title} by ${artistName}`);
  } catch (error) {
    console.error(`Failed to generate embeddings for album ${albumId}:`, error);
    throw error;
  }
}

async function generateArtistEmbeddings(artistId: number, supabase: any, openai: OpenAI): Promise<void> {
  try {
    // Get artist data
    const { data: artistData, error: artistError } = await supabase
      .from('artist')
      .select('name')
      .eq('id', artistId)
      .single();
    
    if (artistError) {
      console.error(`Error fetching artist ${artistId}:`, artistError);
      throw artistError;
    }
    
    const { name } = artistData;
    
    // Generate embedding
    const nameEmbedding = await generateEmbedding(name, openai);
    
    // Store embedding
    const { error: insertError } = await supabase
      .from('artist_embeddings')
      .upsert({
        artist_id: artistId,
        name_embedding: nameEmbedding,
        updated_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.error(`Error storing embeddings for artist ${artistId}:`, insertError);
      throw insertError;
    }
    
    console.log(`Generated embeddings for artist: ${name}`);
  } catch (error) {
    console.error(`Failed to generate embeddings for artist ${artistId}:`, error);
    throw error;
  }
}

async function processBatchEmbeddings(
  type: string = 'all',
  limit: number = 50,
  offset: number = 0,
  supabase: any
): Promise<{ success: boolean; processed: number; errors: number; details: any }> {
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    let processed = 0;
    let errors = 0;
    const details: any = { albums: [], artists: [] };

    if (type === 'albums' || type === 'all') {
      // Get albums without embeddings using the database function
      const { data: albums, error: albumsError } = await supabase
        .rpc('get_albums_without_embeddings', { limit_count: limit });

      if (albumsError) {
        throw albumsError;
      }

      console.log(`Processing ${albums.length} albums for embeddings`);

      for (const album of albums) {
        try {
          await generateAlbumEmbeddings(album.id, supabase, openai);
          processed++;
          details.albums.push({ id: album.id, title: album.title, success: true });
        } catch (error) {
          errors++;
          details.albums.push({ id: album.id, title: album.title, success: false, error: error.message });
        }
      }
    }

    if (type === 'artists' || type === 'all') {
      // Get artists without embeddings using the database function
      const { data: artists, error: artistsError } = await supabase
        .rpc('get_artists_without_embeddings', { limit_count: limit });

      if (artistsError) {
        throw artistsError;
      }

      console.log(`Processing ${artists.length} artists for embeddings`);

      for (const artist of artists) {
        try {
          await generateArtistEmbeddings(artist.id, supabase, openai);
          processed++;
          details.artists.push({ id: artist.id, name: artist.name, success: true });
        } catch (error) {
          errors++;
          details.artists.push({ id: artist.id, name: artist.name, success: false, error: error.message });
        }
      }
    }

    return { success: true, processed, errors, details };
  } catch (error) {
    console.error('Batch embeddings error:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    const { type = 'all', limit = 50, offset = 0 } = await req.json();

    // Process batch embeddings
    const result = await processBatchEmbeddings(type, limit, offset, supabase);

    return new Response(
      JSON.stringify({ 
        ...result,
        type,
        limit,
        offset
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Batch embeddings error:', error);
    
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