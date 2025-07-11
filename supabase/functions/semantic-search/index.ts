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
  limit: number = 10, 
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

  try {
    const { query, searchType = 'combined', limit = 10, similarityThreshold = 0.7 } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required and must be a string' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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