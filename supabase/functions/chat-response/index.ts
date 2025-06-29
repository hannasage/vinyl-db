// @ts-nocheck
import { createClient } from 'jsr:@supabase/supabase-js@2'
import OpenAI from 'npm:openai@4.20.1'

// Tool interface for extensibility
interface Tool {
  name: string;
  description: string;
  parameters: any;
  execute: (params: any, supabase: any) => Promise<any>;
}

// Collection Query Tool
const collectionQueryTool: Tool = {
  name: 'collection_query',
  description: 'Query the user\'s vinyl collection for albums by artist, album name, or both',
  parameters: {
    albumName: 'string (optional)',
    artistName: 'string (optional)'
  },
  execute: async (params: any, supabase: any) => {
    const { albumName, artistName } = params;
    
    // Validate that at least one parameter is provided
    if (!albumName && !artistName) {
      throw new Error('At least one of albumName or artistName is required');
    }

    let query = supabase.from('album').select(`
      id,
      title,
      artist_id,
      variant,
      purchase_date,
      acquired_date,
      preordered,
      artwork_url,
      release_year,
      size
    `);

    // If artist name is provided, filter by artist
    if (artistName) {
      // First get artist IDs that match the name
      const { data: artists, error: artistError } = await supabase
        .from('artist')
        .select('id, name')
        .ilike('name', `%${artistName}%`);

      if (artistError) {
        throw artistError;
      }

      if (!artists || artists.length === 0) {
        return {
          found: false,
          message: `No artist found matching "${artistName}"`,
          albumName: albumName || null,
          artistName
        };
      }

      const artistIds = artists.map(artist => artist.id);
      query = query.in('artist_id', artistIds);
    }

    // If album name is provided, filter by album title
    if (albumName) {
      query = query.ilike('title', `%${albumName}%`);
    }

    // Execute the query
    const { data: albums, error: albumError } = await query;

    if (albumError) {
      throw albumError;
    }

    if (!albums || albums.length === 0) {
      let message = '';
      if (albumName && artistName) {
        message = `No album "${albumName}" found for artist "${artistName}"`;
      } else if (albumName) {
        message = `No album found matching "${albumName}"`;
      } else if (artistName) {
        message = `No albums found for artist "${artistName}"`;
      }
      
      return {
        found: false,
        message,
        albumName: albumName || null,
        artistName: artistName || null
      };
    }

    // Get artist information for all albums
    const artistIds = [...new Set(albums.map(album => album.artist_id))];
    const { data: artists, error: artistsError } = await supabase
      .from('artist')
      .select('id, name')
      .in('id', artistIds);

    if (artistsError) {
      throw artistsError;
    }

    // Create artist lookup map
    const artistMap = artists.reduce((acc, artist) => {
      acc[artist.id] = artist.name;
      return acc;
    }, {});

    // Return the found album(s) with artist information
    const results = albums.map(album => ({
      ...album,
      artist_name: artistMap[album.artist_id] || 'Unknown Artist'
    }));

    // Generate appropriate message based on query type
    let message = '';
    if (albumName && artistName) {
      message = `Found ${results.length} album(s) matching "${albumName}" by "${artistName}"`;
    } else if (albumName) {
      message = `Found ${results.length} album(s) matching "${albumName}"`;
    } else if (artistName) {
      message = `Found ${results.length} album(s) by "${artistName}"`;
    }

    return {
      found: true,
      message,
      albums: results,
      albumName: albumName || null,
      artistName: artistName || null
    };
  }
};

// Tool registry for easy extension
const tools: Record<string, Tool> = {
  collection_query: collectionQueryTool
};

// Function to parse user message using GPT and determine tool to use
async function parseMessageWithGPT(message: string) {
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Build tool descriptions dynamically
    const toolDescriptions = Object.values(tools).map(tool => 
      `- "${tool.name}": ${tool.description}`
    ).join('\n');

    const systemPrompt = `You are a helpful assistant that parses user messages about vinyl record collections. 

Your job is to:
1. Determine if the user is asking about their collection
2. Extract relevant parameters for the appropriate tool
3. Decide which tool to use

Available tools:
${toolDescriptions}

Response format (JSON only):
{
  "tool": "tool_name",
  "parameters": {
    // tool-specific parameters
  },
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Examples:
- "Do I have Dark Side of the Moon by Pink Floyd?" → {"tool": "collection_query", "parameters": {"albumName": "Dark Side of the Moon", "artistName": "Pink Floyd"}, "confidence": 0.95, "reasoning": "Clear collection query with both album and artist"}
- "Do I have any Pink Floyd albums?" → {"tool": "collection_query", "parameters": {"artistName": "Pink Floyd"}, "confidence": 0.95, "reasoning": "Query for all albums by specific artist"}
- "Do I have Dark Side of the Moon?" → {"tool": "collection_query", "parameters": {"albumName": "Dark Side of the Moon"}, "confidence": 0.95, "reasoning": "Query for specific album across all artists"}
- "What Beatles albums do I have?" → {"tool": "collection_query", "parameters": {"artistName": "The Beatles"}, "confidence": 0.95, "reasoning": "Query for all albums by artist"}
- "Hello" → {"tool": "general", "parameters": {}, "confidence": 0.9, "reasoning": "General greeting"}
- "What's the weather?" → {"tool": "general", "parameters": {}, "confidence": 0.9, "reasoning": "Not collection related"}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.1,
      max_tokens: 200
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Parse the JSON response
    const parsed = JSON.parse(content);
    
    // Validate the response structure
    if (!parsed.tool) {
      throw new Error('No tool specified in GPT response');
    }

    return parsed;
  } catch (error) {
    console.error('Error parsing message with GPT:', error);
    // Fallback to basic detection
    return {
      tool: 'general',
      parameters: {},
      confidence: 0.0,
      reasoning: 'GPT parsing failed, falling back to general'
    };
  }
}

// Function to execute a tool
async function executeTool(toolName: string, parameters: any, supabase: any) {
  const tool = tools[toolName];
  
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  return await tool.execute(parameters, supabase);
}

// Function to format response based on tool result
function formatToolResponse(toolName: string, result: any) {
  switch (toolName) {
    case 'collection_query':
      return formatCollectionResponse(result);
    default:
      return {
        message: 'Tool executed successfully',
        type: 'tool_result',
        data: result
      };
  }
}

// Function to format response based on collection query result
function formatCollectionResponse(queryResult: any) {
  if (!queryResult.found) {
    return {
      message: `❌ ${queryResult.message}`,
      type: 'collection_query',
      data: queryResult
    };
  }

  const albums = queryResult.albums;
  if (albums.length === 1) {
    const album = albums[0];
    const purchaseInfo = album.purchase_date ? ` (purchased ${album.purchase_date})` : '';
    const variantInfo = album.variant ? ` - ${album.variant}` : '';
    
    return {
      message: `✅ Yes! You have "${album.title}" by ${album.artist_name}${variantInfo}${purchaseInfo}`,
      type: 'collection_query',
      data: queryResult
    };
  } else {
    const albumList = albums.map((album: any) => 
      `• "${album.title}"${album.variant ? ` (${album.variant})` : ''}`
    ).join('\n');
    
    return {
      message: `✅ Found ${albums.length} albums matching your query:\n\n${albumList}`,
      type: 'collection_query',
      data: queryResult
    };
  }
}

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

    // Get the request body
    const requestData = await req.json().catch(() => ({}));
    const userMessage = requestData.message || '';
    
    // Log the received data for debugging
    console.log('Received request data:', {
      message: userMessage,
      hasImage: requestData.hasImage || false,
      imageData: requestData.imageData ? `Base64 data (${requestData.imageData.length} chars)` : 'No image data',
      mimeType: requestData.mimeType || 'No mime type'
    });

    // Parse the message using GPT
    const parsedMessage = await parseMessageWithGPT(userMessage);
    console.log('GPT parsing result:', parsedMessage);

    // Handle based on the determined tool
    if (parsedMessage.tool && parsedMessage.tool !== 'general' && tools[parsedMessage.tool]) {
      // Execute the specified tool
      try {
        const toolResult = await executeTool(parsedMessage.tool, parsedMessage.parameters, supabase);
        const formattedResponse = formatToolResponse(parsedMessage.tool, toolResult);
        
        return new Response(JSON.stringify({
          message: formattedResponse.message,
          timestamp: new Date().toISOString(),
          type: formattedResponse.type,
          data: formattedResponse.data
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (toolError) {
        console.error('Tool execution error:', toolError);
        return new Response(JSON.stringify({
          message: "Sorry, I encountered an error while processing your request. Please try again.",
          timestamp: new Date().toISOString(),
          type: 'error'
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    // Default response for general queries or when GPT parsing fails
    const response = {
      message: "Hi! I can help you check your vinyl collection. Try asking me something like 'Do I have Dark Side of the Moon by Pink Floyd?' or 'Is Abbey Road by The Beatles in my collection?'",
      timestamp: new Date().toISOString(),
      type: 'general'
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
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