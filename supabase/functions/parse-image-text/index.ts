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
    const { imageUrl } = requestData;
    
    // Validate required parameters
    if (!imageUrl) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters',
        message: 'imageUrl is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Get Tavily API key
    const tavilyApiKey = Deno.env.get('TAVILY_API_KEY');
    if (!tavilyApiKey) {
      return new Response(JSON.stringify({
        error: 'Missing Tavily API key',
        message: 'TAVILY_API_KEY environment variable is not set'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    console.log(`[parse-image-text] Request: imageUrl="${imageUrl}"`);

    // Use Tavily's image analysis to extract text
    const searchResponse = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tavilyApiKey}`
      },
      body: JSON.stringify({
        query: `Analyze this image and extract any text, album names, artist names, or other relevant information: ${imageUrl}`,
        search_depth: 'basic',
        include_answer: true,
        include_raw_content: false,
        max_results: 1,
        include_domains: [],
        exclude_domains: [],
        category: 'general',
        safety_level: 'moderate',
      })
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error(`[parse-image-text] Tavily API error:`, {
        status: searchResponse.status,
        statusText: searchResponse.statusText,
        errorText
      });
      throw new Error(`Tavily API error: ${searchResponse.status} ${searchResponse.statusText} - ${errorText}`);
    }

    const searchResult = await searchResponse.json();
    
    console.log(`[parse-image-text] Tavily response:`, {
      status: searchResponse.status,
      hasAnswer: !!searchResult.answer,
      answerLength: searchResult.answer?.length || 0
    });

    // Extract parsed text from the search results
    const parsedText = {
      imageUrl,
      extractedText: searchResult.answer || '',
      analysis: searchResult.results?.[0] || {}
    };

    return new Response(JSON.stringify(parsedText), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[parse-image-text] Error:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to parse image text',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}); 