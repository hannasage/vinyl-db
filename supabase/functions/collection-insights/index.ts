import { createClient } from 'jsr:@supabase/supabase-js@2'
import { OpenAI } from 'jsr:@openai/openai@4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CollectionInsightsRequest {
  insightType?: 'genres' | 'eras' | 'themes' | 'recommendations' | 'temporal';
  limit?: number;
}

interface Insight {
  type: string;
  title: string;
  description: string;
  confidence: number;
  relatedAlbums?: string[];
}

async function generateCollectionInsights(
  insightType: string = 'genres',
  limit: number = 5,
  supabase: any
): Promise<Insight[]> {
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Get collection data for analysis
    const { data: albums, error: albumsError } = await supabase
      .from('album')
      .select(`
        title,
        release_year,
        purchase_date,
        acquired_date,
        artist:artist_id(name)
      `)
      .order('acquired_date', { ascending: false })
      .limit(100); // Analyze recent 100 albums for insights

    if (albumsError) {
      throw albumsError;
    }

    if (!albums || albums.length === 0) {
      return [{
        type: insightType,
        title: 'No Collection Data',
        description: 'Your collection is empty. Start adding albums to get insights!',
        confidence: 1.0
      }];
    }

    // Prepare collection summary for GPT analysis
    const collectionSummary = albums.map(album => ({
      title: album.title,
      artist: album.artist.name,
      releaseYear: album.release_year,
      purchaseDate: album.purchase_date,
      acquiredDate: album.acquired_date
    }));

    // Create analysis prompt based on insight type
    let analysisPrompt = '';
    let outputFormat = '';

    switch (insightType) {
      case 'genres':
        analysisPrompt = `Analyze this vinyl collection and identify the most prominent genres and musical styles. Consider album titles, artist names, and release years to infer genres.`;
        outputFormat = `Return a JSON array of genre insights with: type, title, description, confidence (0-1), and relatedAlbums array.`;
        break;
      
      case 'eras':
        analysisPrompt = `Analyze this vinyl collection and identify the most prominent musical eras and decades represented. Consider release years and musical periods.`;
        outputFormat = `Return a JSON array of era insights with: type, title, description, confidence (0-1), and relatedAlbums array.`;
        break;
      
      case 'themes':
        analysisPrompt = `Analyze this vinyl collection and identify recurring themes, moods, or characteristics. Look for patterns in album titles, artist names, and musical styles.`;
        outputFormat = `Return a JSON array of theme insights with: type, title, description, confidence (0-1), and relatedAlbums array.`;
        break;
      
      case 'recommendations':
        analysisPrompt = `Based on this vinyl collection, suggest albums that would complement the existing collection. Consider gaps, similar artists, or related genres.`;
        outputFormat = `Return a JSON array of recommendation insights with: type, title, description, confidence (0-1), and relatedAlbums array.`;
        break;
      
      case 'temporal':
        analysisPrompt = `Analyze the temporal patterns in this vinyl collection. Look at purchase dates, acquisition patterns, and how collecting habits have evolved over time.`;
        outputFormat = `Return a JSON array of temporal insights with: type, title, description, confidence (0-1), and relatedAlbums array.`;
        break;
      
      default:
        analysisPrompt = `Analyze this vinyl collection and provide general insights about the musical taste and collecting patterns.`;
        outputFormat = `Return a JSON array of general insights with: type, title, description, confidence (0-1), and relatedAlbums array.`;
    }

    const prompt = `## Vinyl Collection Analysis

${analysisPrompt}

## Collection Data
${JSON.stringify(collectionSummary, null, 2)}

## Instructions
- Analyze the collection data carefully
- Provide ${limit} insights maximum
- Be specific and actionable
- Consider the context of vinyl collecting
- ${outputFormat}

## Output Format
Return ONLY valid JSON array, no additional text.`;

    // Generate insights using GPT
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert vinyl collection analyst. Provide insightful, accurate analysis in the requested JSON format only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from GPT');
    }

    // Parse the JSON response
    try {
      const insights = JSON.parse(responseText);
      return Array.isArray(insights) ? insights.slice(0, limit) : [insights];
    } catch (parseError) {
      console.error('Failed to parse GPT response:', responseText);
      throw new Error('Invalid response format from GPT');
    }

  } catch (error) {
    console.error('Error generating collection insights:', error);
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

    const { insightType = 'genres', limit = 5 } = await req.json();

    // Validate parameters
    if (limit < 1 || limit > 20) {
      return new Response(
        JSON.stringify({ error: 'Limit must be between 1 and 20' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate insights
    const insights = await generateCollectionInsights(insightType, limit, supabase);

    return new Response(
      JSON.stringify({ 
        success: true, 
        insights,
        insightType,
        limit,
        generatedAt: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Collection insights error:', error);
    
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