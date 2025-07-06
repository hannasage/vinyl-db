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
    const { albumName, artistName } = requestData;
    
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

    console.log(`[fetch-album-details] Request: albumName="${albumName}", artistName="${artistName}"`);

    // Search for album details using Tavily
    const searchResponse = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tavilyApiKey}`
      },
      body: JSON.stringify({
        query: `${artistName} ${albumName} album release date year genre`,
        search_depth: 'basic',
        include_answer: true,
        include_raw_content: false,
        max_results: 10,
        include_domains: [],
        exclude_domains: [],
        category: 'general',
        safety_level: 'moderate',
      })
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error(`[fetch-album-details] Tavily API error:`, {
        status: searchResponse.status,
        statusText: searchResponse.statusText,
        errorText
      });
      throw new Error(`Tavily API error: ${searchResponse.status} ${searchResponse.statusText} - ${errorText}`);
    }

    const searchResult = await searchResponse.json();
    
    console.log(`[fetch-album-details] Tavily response:`, {
      status: searchResponse.status,
      hasAnswer: !!searchResult.answer,
      answerLength: searchResult.answer?.length || 0,
      resultCount: searchResult.results?.length || 0
    });

    // Extract album details from the search results
    const albumDetails = {
      albumName,
      artistName,
      answer: searchResult.answer || '',
      results: searchResult.results || [],
      searchQuery: `${artistName} ${albumName} album release date year genre`
    };

    return new Response(JSON.stringify(albumDetails), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[fetch-album-details] Error:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to fetch album details',
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