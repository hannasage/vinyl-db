// @ts-nocheck
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Input validation functions
function validateWebSearchInput(query: string): string {
  if (!query || typeof query !== 'string') return '';
  
  return query
    .trim()
    .replace(/[<>]/g, '') // Remove HTML-like characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 500); // Limit length
}

// Web search result interface
interface WebSearchResult {
  success: boolean;
  query: string;
  answer: string;
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  confidence: number;
  searchType: string;
  error?: string;
}

// Web search parameters interface
interface WebSearchParams {
  query: string;
  searchType: 'genre' | 'release_info' | 'artist_info' | 'context' | 'reception';
  albumName?: string;
  artistName?: string;
  year?: number;
}

// Function to perform web search using Tavily API
async function performWebSearch(params: WebSearchParams): Promise<WebSearchResult> {
  const { query, searchType, albumName, artistName, year } = params;
  
  console.log('[web-search] Performing web search with params:', params);
  
  // Get Tavily API key
  const tavilyApiKey = Deno.env.get('TAVILY_API_KEY');
  if (!tavilyApiKey) {
    throw new Error('TAVILY_API_KEY environment variable is not set');
  }

  // Build search query based on search type
  let searchQuery = query;
  
  // Enhance query with context for better results
  if (albumName && artistName) {
    switch (searchType) {
      case 'genre':
        searchQuery = `What genre is ${albumName} by ${artistName}? ${query}`;
        break;
      case 'release_info':
        searchQuery = `When was ${albumName} by ${artistName} released? ${query}`;
        break;
      case 'artist_info':
        searchQuery = `Who is ${artistName}? ${query}`;
        break;
      case 'context':
        searchQuery = `What was happening when ${albumName} by ${artistName} was released? ${query}`;
        break;
      case 'reception':
        searchQuery = `How was ${albumName} by ${artistName} received when it came out? ${query}`;
        break;
    }
  }

  // Add year context if available
  if (year) {
    searchQuery += ` (released in ${year})`;
  }

  console.log('[web-search] Enhanced search query:', searchQuery);

  try {
    // Perform search with Tavily API
    const searchResponse = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tavilyApiKey}`
      },
      body: JSON.stringify({
        query: searchQuery,
        search_depth: 'advanced',
        include_answer: true,
        include_raw_content: false,
        max_results: 5,
        include_domains: [],
        exclude_domains: [],
        category: 'general',
        safety_level: 'moderate',
      })
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('[web-search] Tavily API error:', {
        status: searchResponse.status,
        statusText: searchResponse.statusText,
        errorText
      });
      throw new Error(`Tavily API error: ${searchResponse.status} ${searchResponse.statusText} - ${errorText}`);
    }

    const searchResult = await searchResponse.json();
    
    console.log('[web-search] Tavily response received:', {
      status: searchResponse.status,
      hasAnswer: !!searchResult.answer,
      hasResults: !!searchResult.results,
      resultCount: searchResult.results?.length || 0
    });

    // Extract answer and sources
    const answer = searchResult.answer || 'I found some information, but couldn\'t generate a specific answer.';
    const sources = (searchResult.results || []).map((result: any) => ({
      title: result.title || 'Unknown Source',
      url: result.url || '',
      snippet: result.content || result.snippet || ''
    }));

    // Calculate confidence based on answer quality and source count
    let confidence = 0.7; // Base confidence
    if (searchResult.answer && searchResult.answer.length > 50) {
      confidence += 0.2; // Good answer length
    }
    if (sources.length >= 3) {
      confidence += 0.1; // Multiple sources
    }
    confidence = Math.min(confidence, 0.95); // Cap at 95%

    return {
      success: true,
      query: searchQuery,
      answer,
      sources,
      confidence,
      searchType
    };

  } catch (error) {
    console.error('[web-search] Error performing web search:', error);
    throw error;
  }
}

// Function to determine if a query requires web search
function shouldUseWebSearch(query: string): boolean {
  const queryLower = query.toLowerCase();
  
  // Keywords that typically require web search
  const webSearchKeywords = [
    'genre', 'genres', 'what genre',
    'when was', 'when did', 'release date', 'released',
    'who is', 'who are', 'artist background', 'producer',
    'what was happening', 'context', 'era', 'period',
    'how was it received', 'reception', 'reviews', 'critics',
    'influence', 'impact', 'significance', 'meaning'
  ];
  
  return webSearchKeywords.some(keyword => queryLower.includes(keyword));
}

// Function to determine search type from query
function determineSearchType(query: string): 'genre' | 'release_info' | 'artist_info' | 'context' | 'reception' {
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('genre')) {
    return 'genre';
  } else if (queryLower.includes('when') || queryLower.includes('release') || queryLower.includes('came out')) {
    return 'release_info';
  } else if (queryLower.includes('who') || queryLower.includes('producer') || queryLower.includes('background')) {
    return 'artist_info';
  } else if (queryLower.includes('reception') || queryLower.includes('received') || queryLower.includes('reviews')) {
    return 'reception';
  } else if (queryLower.includes('context') || queryLower.includes('happening') || queryLower.includes('era')) {
    return 'context';
  }
  
  // Default to genre for music-related queries
  return 'genre';
}

// Main handler
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

    // Create Supabase client for authentication
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

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
    const { query, searchType, albumName, artistName, year } = requestData;
    
    console.log('[web-search] Received request:', {
      query,
      searchType,
      albumName,
      artistName,
      year
    });

    // Validate input
    const validatedQuery = validateWebSearchInput(query);
    if (!validatedQuery) {
      return new Response(JSON.stringify({
        error: 'Invalid query',
        message: 'Query parameter is required and must be a non-empty string'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Determine search type if not provided
    const finalSearchType = searchType || determineSearchType(validatedQuery);
    
    // Check if this query should use web search
    if (!shouldUseWebSearch(validatedQuery)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'This query does not require web search. Try using collection search instead.',
        query: validatedQuery,
        searchType: finalSearchType
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Perform web search
    const searchParams: WebSearchParams = {
      query: validatedQuery,
      searchType: finalSearchType,
      albumName,
      artistName,
      year
    };

    const result = await performWebSearch(searchParams);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('[web-search] Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Unknown error occurred during web search',
      query: requestData?.query || 'unknown'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}); 