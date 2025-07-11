import { createClient } from 'jsr:@supabase/supabase-js@2'
import { OpenAI } from 'jsr:@openai/openai@4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CollectionQueryRequest {
  query: string;
  searchType?: 'album' | 'artist' | 'temporal' | 'combined';
  limit?: number;
  similarityThreshold?: number;
}

interface SearchResult {
  album_id: number;
  title: string;
  artist_name: string;
  release_year: number | null;
  purchase_date: string | null;
  acquired_date: string | null;
  similarity: number;
}

async function performCollectionQuery(
  query: string, 
  searchType: string = 'combined',
  limit: number = 1000, 
  threshold: number = 0.7,
  supabase: any
): Promise<SearchResult[]> {
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Generate query embedding using OpenAI API
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Select appropriate embedding column based on search type
    let embeddingColumn = 'combined_embedding';
    switch (searchType) {
      case 'album':
        embeddingColumn = 'title_embedding';
        break;
      case 'artist':
        embeddingColumn = 'artist_embedding';
        break;
      case 'temporal':
        embeddingColumn = 'temporal_embedding';
        break;
      default:
        embeddingColumn = 'combined_embedding';
    }

    // Perform vector similarity search using pgvector
    const { data: results, error } = await supabase.rpc('match_albums_by_type', {
      query_embedding: queryEmbedding,
      embedding_column: embeddingColumn,
      match_threshold: threshold,
      match_count: limit
    });

    if (error) {
      console.error('Vector search error:', error);
      throw error;
    }

    return results || [];
  } catch (error) {
    console.error('Error in performCollectionQuery:', error);
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

    const { query, searchType = 'combined', limit = 1000, similarityThreshold = 0.7 } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required and must be a string' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Perform the semantic search
    const results = await performCollectionQuery(
      query,
      searchType,
      limit,
      similarityThreshold,
      supabase
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        query,
        searchType,
        limit,
        similarityThreshold
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Semantic search error:', error);
    
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