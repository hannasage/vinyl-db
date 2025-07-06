// @ts-nocheck
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { OpenAI } from 'jsr:@openai/openai@4'

// Operation interface
interface Operation {
  tool: string;
  parameters: any;
  description: string;
  requiresConfirmation?: boolean;
}

interface ExecutionResult {
  operation: Operation;
  success: boolean;
  result: any;
  error?: string;
  retryCount?: number;
  shouldRetryWithAlternative?: boolean;
  alternativeSearch?: Operation;
}

// Tool definitions
const TOOLS = {
  vinyl_collection_query: {
    name: 'vinyl_collection_query',
    description: 'Query the user\'s vinyl collection for albums by artist, album name, or both',
    inputSchema: {
      type: 'object',
      properties: {
        albumName: { type: 'string', description: 'Album name to search for (optional)' },
        artistName: { type: 'string', description: 'Artist name to search for (optional)' }
      }
    }
  },
  vinyl_add_album: {
    name: 'vinyl_add_album',
    description: 'Add a new album to the user\'s vinyl collection',
    inputSchema: {
      type: 'object',
      properties: {
        albumName: { type: 'string', description: 'Album name (required)' },
        artistName: { type: 'string', description: 'Artist name (required)' },
        releaseYear: { type: 'number', description: 'Release year (optional)' },
        variant: { type: 'string', description: 'Album variant (optional)' },
        purchaseDate: { type: 'string', description: 'Purchase date in YYYY-MM-DD format (optional)' },
        acquiredDate: { type: 'string', description: 'Acquired date in YYYY-MM-DD format (optional)' },
        preordered: { type: 'boolean', description: 'Whether the album was preordered (optional)' },
        artworkUrl: { type: 'string', description: 'URL to album artwork (optional)' },
        size: { type: 'number', description: 'Record size in inches (optional)' }
      },
      required: ['albumName', 'artistName']
    }
  },
  vinyl_remove_album: {
    name: 'vinyl_remove_album',
    description: 'Remove an album from the user\'s vinyl collection',
    inputSchema: {
      type: 'object',
      properties: {
        albumId: { type: 'number', description: 'Album ID (optional)' },
        albumName: { type: 'string', description: 'Album name (optional)' },
        artistName: { type: 'string', description: 'Artist name (optional)' }
      }
    }
  }
};

// Function to plan operations using GPT
async function planOperations(message: string, conversationContext?: string): Promise<Operation[]> {
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return [];
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    const toolDescriptions = Object.values(TOOLS).map(tool => 
      `- "${tool.name}": ${tool.description}`
    ).join('\n');

    const systemPrompt = `You are a helpful assistant that plans operations for vinyl collection management.

Your job is to:
1. Analyze the user's request
2. Consider the conversation context to understand references and maintain continuity
3. Break down complex operations into sequential tool calls
4. Create an array of operations to execute
5. IMPORTANT: For add/remove operations, mark them as requiring confirmation
6. CRITICAL: Distinguish between album names and artist names in queries

${conversationContext ? `CONVERSATION CONTEXT:
${conversationContext}

Use this context to understand references like "her new album" or "that artist" and maintain conversation continuity.` : ''}

Available tools:
${toolDescriptions}

OPERATION FORMAT:
Return a JSON object with this structure:
{
  "operations": [
    {
      "tool": "tool_name",
      "parameters": { "param1": "value1" },
      "description": "Human-readable description of what this operation does",
      "requiresConfirmation": true/false
    }
  ]
}

GUIDELINES:
- For collection queries, use vinyl_collection_query
- For adding albums, use vinyl_add_album and set requiresConfirmation: true
- For removing albums, use vinyl_remove_album and set requiresConfirmation: true

ARTIST vs ALBUM DETECTION:
- If the user asks "do I have [name]", analyze if [name] is likely an artist or album
- Artist indicators: single names, band names, known artists
- Album indicators: longer titles, "album", "record", "LP" keywords
- When uncertain, prefer artist search first (more common query pattern)
- For ambiguous cases, plan BOTH artist and album searches

EXAMPLES:
User: "Do I have Dark Side of the Moon by Pink Floyd?"
Response: {
  "operations": [
    {
      "tool": "vinyl_collection_query",
      "parameters": { "albumName": "Dark Side of the Moon", "artistName": "Pink Floyd" },
      "description": "Query collection for Dark Side of the Moon by Pink Floyd",
      "requiresConfirmation": false
    }
  ]
}

User: "Do I have Pink Floyd?"
Response: {
  "operations": [
    {
      "tool": "vinyl_collection_query",
      "parameters": { "artistName": "Pink Floyd" },
      "description": "Query collection for albums by Pink Floyd",
      "requiresConfirmation": false
    }
  ]
}

User: "Add Dark Side of the Moon by Pink Floyd to my collection"
Response: {
  "operations": [
    {
      "tool": "vinyl_add_album",
      "parameters": { "albumName": "Dark Side of the Moon", "artistName": "Pink Floyd" },
      "description": "Add Dark Side of the Moon by Pink Floyd to collection",
      "requiresConfirmation": true
    }
  ]
}

Now analyze this user request: "${message}"

Return only the JSON object with the operations array.`;

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    if (conversationContext) {
      const contextLines = conversationContext.split('\n').filter(line => line.trim());
      for (const line of contextLines) {
        if (line.startsWith('User: ')) {
          messages.push({ role: 'user', content: line.substring(6) });
        } else if (line.startsWith('Assistant: ')) {
          messages.push({ role: 'assistant', content: line.substring(11) });
        }
      }
    }

    messages.push({ role: 'user', content: message });

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.1,
      max_tokens: 500
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      return [];
    }

    const parsed = JSON.parse(content);
    
    if (parsed.operations && Array.isArray(parsed.operations)) {
      return parsed.operations;
    }

    return [];
  } catch (error) {
    console.error('Error planning operations:', error);
    return [];
  }
}

// Direct tool execution functions
async function executeVinylCollectionQuery(params: any, supabase: any): Promise<any> {
  const { albumName, artistName } = params;
  
  console.log('[chat-response] Executing vinyl_collection_query with params:', params);
  
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

  if (artistName) {
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

  if (albumName) {
    query = query.ilike('title', `%${albumName}%`);
  }

  const { data: albums, error: albumError } = await query;

  if (albumError) {
    throw albumError;
  }

  if (!albums || albums.length === 0) {
    return {
      found: false,
      message: `No albums found matching your search`,
      albumName: albumName || null,
      artistName: artistName || null
    };
  }

  const results = await Promise.all(albums.map(async (album) => {
    const { data: artist, error: artistError } = await supabase
      .from('artist')
      .select('name')
      .eq('id', album.artist_id)
      .single();

    if (artistError) {
      console.error('Error fetching artist name:', artistError);
      return {
        ...album,
        artist_name: 'Unknown Artist'
      };
    }

    return {
      ...album,
      artist_name: artist.name
    };
  }));

  const message = results.length === 1 
    ? `Found 1 album: "${results[0].title}" by ${results[0].artist_name}`
    : `Found ${results.length} albums: ${results.map(a => `"${a.title}" by ${a.artist_name}`).join(', ')}`;

  return {
    found: true,
    message,
    albums: results,
    albumName: albumName || null,
    artistName: artistName || null
  };
}

async function executeVinylAddAlbum(params: any, supabase: any): Promise<any> {
  console.log('[chat-response] Executing vinyl_add_album with params:', params);
  
  const { albumName, artistName, releaseYear, variant, purchaseDate, acquiredDate, preordered, artworkUrl, size } = params;
  
  if (!albumName || !artistName) {
    throw new Error('Both albumName and artistName are required');
  }

  // Check if artist already exists
  let { data: existingArtists, error: artistQueryError } = await supabase
    .from('artist')
    .select('id, name')
    .ilike('name', artistName);

  if (artistQueryError) {
    throw artistQueryError;
  }

  let artistId;

  if (existingArtists && existingArtists.length > 0) {
    artistId = existingArtists[0].id;
    console.log(`[chat-response] Using existing artist: "${existingArtists[0].name}" (ID: ${artistId})`);
  } else {
    const { data: newArtist, error: artistCreateError } = await supabase
      .from('artist')
      .insert([{ name: artistName }])
      .select('id, name')
      .single();

    if (artistCreateError) {
      throw artistCreateError;
    }

    artistId = newArtist.id;
    console.log(`[chat-response] Created new artist: "${newArtist.name}" (ID: ${artistId})`);
  }

  const albumData = {
    title: albumName,
    artist_id: artistId,
    release_year: releaseYear || null,
    variant: variant || null,
    purchase_date: purchaseDate || null,
    acquired_date: acquiredDate || new Date().toISOString().split('T')[0],
    preordered: preordered || false,
    artwork_url: artworkUrl || null,
    size: size || 12
  };

  const { data: newAlbum, error: albumCreateError } = await supabase
    .from('album')
    .insert([albumData])
    .select(`
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
    `)
    .single();

  if (albumCreateError) {
    throw albumCreateError;
  }

  const { data: artist, error: artistError } = await supabase
    .from('artist')
    .select('name')
    .eq('id', artistId)
    .single();

  if (artistError) {
    throw artistError;
  }

  return {
    success: true,
    message: `Successfully added "${albumName}" by ${artistName} to your collection`,
    album: {
      ...newAlbum,
      artist_name: artist.name
    }
  };
}

async function executeVinylRemoveAlbum(params: any, supabase: any): Promise<any> {
  console.log('[chat-response] Executing vinyl_remove_album with params:', params);
  
  const { albumId, albumName, artistName } = params;

  if (!albumId && !albumName) {
    throw new Error('Provide albumId or albumName (artistName is optional).');
  }

  let album;
  if (albumId) {
    const { data, error } = await supabase
      .from('album')
      .select('id, title, artist_id')
      .eq('id', albumId)
      .single();
    
    if (error || !data) {
      throw new Error(`No album found with id ${albumId}`);
    }
    album = data;
  } else {
    let query = supabase
      .from('album')
      .select('id, title, artist_id, artist(name)')
      .ilike('title', albumName);
    
    if (artistName) {
      const { data: artists, error: artistError } = await supabase
        .from('artist')
        .select('id')
        .ilike('name', artistName);
      
      if (artistError || !artists?.length) {
        throw new Error(`No artist found matching "${artistName}"`);
      }
      const artistId = artists[0].id;
      query = query.eq('artist_id', artistId);
    }
    
    const { data: albums, error: albumError } = await query;
    
    if (albumError || !albums?.length) {
      const errorMessage = artistName 
        ? `No album found with title "${albumName}" for artist "${artistName}"`
        : `No album found with title "${albumName}"`;
      throw new Error(errorMessage);
    }
    
    if (albums.length > 1 && !artistName) {
      const albumOptions = albums.map(a => `"${a.title}" by ${a.artist?.name || 'Unknown Artist'}`).join(', ');
      throw new Error(`Multiple albums found with title "${albumName}". Please specify the artist. Options: ${albumOptions}`);
    }
    
    album = albums[0];
  }

  // Delete related entries first
  const { data: relatedEntries, error: entriesError } = await supabase
    .from('entry')
    .select('id')
    .eq('albumId', album.id);
  
  if (entriesError) {
    throw entriesError;
  }
  
  if (relatedEntries && relatedEntries.length > 0) {
    const { error: deleteEntriesError } = await supabase
      .from('entry')
      .delete()
      .eq('albumId', album.id);
    
    if (deleteEntriesError) {
      throw deleteEntriesError;
    }
  }

  // Delete the album
  const { error: deleteError } = await supabase
    .from('album')
    .delete()
    .eq('id', album.id);
  
  if (deleteError) {
    throw deleteError;
  }

  // Check if artist is now orphaned
  const { data: remainingAlbums, error: checkError } = await supabase
    .from('album')
    .select('id')
    .eq('artist_id', album.artist_id);
  
  if (!checkError && (!remainingAlbums || remainingAlbums.length === 0)) {
    // Delete orphaned artist
    await supabase
      .from('artist')
      .delete()
      .eq('id', album.artist_id);
  }

  return {
    success: true,
    message: `Successfully removed "${album.title}" from your collection`
  };
}

// Function to execute operations directly
async function executeOperation(operation: Operation, supabase: any): Promise<{success: boolean, result: any, error?: string, shouldRetryWithAlternative?: boolean}> {
  console.log(`[chat-response] Executing operation: ${operation.tool} with params:`, operation.parameters);
  
  try {
    let result;
    
    switch (operation.tool) {
      case 'vinyl_collection_query':
        result = await executeVinylCollectionQuery(operation.parameters, supabase);
        break;
      case 'vinyl_add_album':
        result = await executeVinylAddAlbum(operation.parameters, supabase);
        break;
      case 'vinyl_remove_album':
        result = await executeVinylRemoveAlbum(operation.parameters, supabase);
        break;
      default:
        throw new Error(`Unknown tool: ${operation.tool}`);
    }
    
    console.log(`[chat-response] Tool ${operation.tool} returned result:`, result);
    
    // Check if this is a collection query that returned no results
    if (operation.tool === 'vinyl_collection_query' && result.found === false) {
      const hasAlbumName = operation.parameters.albumName && !operation.parameters.artistName;
      const hasArtistName = operation.parameters.artistName && !operation.parameters.albumName;
      
      if (hasAlbumName) {
        console.log(`[chat-response] Album search returned no results, will try artist search for: ${operation.parameters.albumName}`);
        return {
          success: true,
          result,
          shouldRetryWithAlternative: true,
          alternativeSearch: {
            tool: 'vinyl_collection_query',
            parameters: { artistName: operation.parameters.albumName },
            description: `Query collection for albums by ${operation.parameters.albumName} (alternative search)`,
            requiresConfirmation: false
          }
        };
      } else if (hasArtistName) {
        console.log(`[chat-response] Artist search returned no results, will try album search for: ${operation.parameters.artistName}`);
        return {
          success: true,
          result,
          shouldRetryWithAlternative: true,
          alternativeSearch: {
            tool: 'vinyl_collection_query',
            parameters: { albumName: operation.parameters.artistName },
            description: `Query collection for album "${operation.parameters.artistName}" (alternative search)`,
            requiresConfirmation: false
          }
        };
      }
    }
    
    return {
      success: true,
      result
    };
  } catch (error) {
    console.error(`[chat-response] Operation execution error for ${operation.tool}:`, error);
    return {
      success: false,
      result: null,
      error: error.message
    };
  }
}

// Function to format response using GPT
async function formatResponseWithGPT(
  originalQuestion: string, 
  executionResults: Array<{operation: Operation, success: boolean, result: any, error?: string}>,
  conversationContext?: string
): Promise<string> {
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return 'I processed your request but encountered an error. Please try again.';
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    const taskInfo = executionResults.map((result, index) => {
      const status = result.success ? 'SUCCESS' : 'FAILED';
      const details = result.success 
        ? JSON.stringify(result.result, null, 2)
        : `Error: ${result.error}`;
      
      return `${index + 1}. ${result.operation.description} (${result.operation.tool}) - ${status}\n${details}`;
    }).join('\n\n');

    const systemPrompt = `You are a helpful assistant that formats responses for vinyl collection queries.

Your job is to:
1. Take the raw execution results from database operations
2. Format them into natural, conversational responses
3. Be concise and factual
4. Use the exact album titles and artist names from the results
5. Don't add extra commentary or questions

${conversationContext ? `CONVERSATION CONTEXT:
${conversationContext}

Use this context only to resolve references, not for commentary.` : ''}

RESPONSE FORMATS:
- Collection queries: "Yes! You have [album] by [artist]" or "No, you don't have [album] by [artist]"
- Multiple results: "Found X albums: [list with bullet points using exact titles from results]"
- Alternative searches: "I searched for [original query] and found nothing, but when I searched for [alternative query], I found [results]"
- Add operations: "Successfully added [album] by [artist] to your collection"
- Remove operations: "Successfully removed [album] by [artist] from your collection"
- Batch operations: "Completed [operation]: [summary of results]"
- Errors: "Sorry, I couldn't [action] because [reason]"

The user asked: "${originalQuestion}"

Tasks executed:
${taskInfo}

Please provide a strictly factual, concise response based on this information. Do NOT add any extra commentary, opinions, or questions. Use ONLY the exact album titles and details provided in the task results above.`;

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    if (conversationContext) {
      const contextLines = conversationContext.split('\n').filter(line => line.trim());
      for (const line of contextLines) {
        if (line.startsWith('User: ')) {
          messages.push({ role: 'user', content: line.substring(6) });
        } else if (line.startsWith('Assistant: ')) {
          messages.push({ role: 'assistant', content: line.substring(11) });
        }
      }
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
      max_tokens: 500
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    return content.trim();
  } catch (error) {
    console.error('Error formatting response with GPT:', error);
    return `I processed your request "${originalQuestion}" but encountered an error formatting the response. Please try again.`;
  }
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
    const userMessage = requestData.message || '';
    const conversationContext = requestData.conversationContext || '';
    const confirmedOperation = requestData.confirmedOperation || null;
    
    console.log('Received request data:', {
      message: userMessage,
      contextLength: conversationContext.length,
      hasConfirmedOperation: !!confirmedOperation
    });

    // If this is a confirmed operation, execute it directly
    if (confirmedOperation) {
      console.log('[chat-response] Executing confirmed operation:', confirmedOperation);
      
      const result = await executeOperation(confirmedOperation, supabase);
      
      if (result.success) {
        // Structure the result to match what formatResponseWithGPT expects
        const executionResult = {
          operation: confirmedOperation,
          success: result.success,
          result: result.result,
          error: result.error
        };
        
        const formattedMessage = await formatResponseWithGPT(userMessage, [executionResult], conversationContext);
        
        return new Response(JSON.stringify({
          message: formattedMessage,
          timestamp: new Date().toISOString(),
          type: 'confirmed_operation',
          data: {
            operation: confirmedOperation,
            result: result.result
          }
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } else {
        return new Response(JSON.stringify({
          message: `Sorry, I couldn't complete the operation: ${result.error}`,
          timestamp: new Date().toISOString(),
          type: 'error',
          data: {
            operation: confirmedOperation,
            error: result.error
          }
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    // Plan operations
    const operations = await planOperations(userMessage, conversationContext);
    
    if (operations.length === 0) {
      const response = {
        message: "Hi! I can help you check your vinyl collection. Try asking me something like 'Do I have Dark Side of the Moon by Pink Floyd?' or 'Do I have these albums: Dark Side of the Moon, Abbey Road?'",
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
    }

    // Check if any operations require confirmation
    const operationsRequiringConfirmation = operations.filter(op => op.requiresConfirmation);
    const operationsToExecute = operations.filter(op => !op.requiresConfirmation);
    
    if (operationsRequiringConfirmation.length > 0) {
      // Return confirmation requests instead of executing
      const confirmationRequests = operationsRequiringConfirmation.map((op, index) => {
        const operationId = `op_${Date.now()}_${index}`;
        const action = op.tool === 'vinyl_add_album' ? 'add' : 'remove';
        
        return {
          operationId,
          album: {
            title: op.parameters.albumName || 'Unknown Album',
            artist: op.parameters.artistName || 'Unknown Artist',
            releaseYear: op.parameters.releaseYear,
            artworkUrl: op.parameters.artworkUrl
          },
          action,
          originalOperation: op
        };
      });
      
      const response = {
        message: `I found ${operationsRequiringConfirmation.length} album(s) that need your confirmation before ${operationsRequiringConfirmation[0].tool === 'vinyl_add_album' ? 'adding' : 'removing'} from your collection. Please review the details below.`,
        timestamp: new Date().toISOString(),
        type: 'album_confirmation',
        data: {
          confirmations: confirmationRequests,
          pendingOperations: operationsRequiringConfirmation
        }
      };
      
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // Execute operations that don't require confirmation
    if (operationsToExecute.length > 0) {
      console.log(`Executing ${operationsToExecute.length} operation(s):`, operationsToExecute.map(op => op.description));
      
      const results: ExecutionResult[] = [];
      
      for (const operation of operationsToExecute) {
        const result = await executeOperation(operation, supabase);
        results.push({
          operation,
          success: result.success,
          result: result.result,
          error: result.error
        });
        
        // Handle alternative searches
        if (result.shouldRetryWithAlternative && result.alternativeSearch) {
          console.log(`[chat-response] Trying alternative search: ${result.alternativeSearch.description}`);
          const alternativeResult = await executeOperation(result.alternativeSearch, supabase);
          results.push({
            operation: result.alternativeSearch,
            success: alternativeResult.success,
            result: alternativeResult.result,
            error: alternativeResult.error
          });
        }
      }
      
      // Format response using GPT
      const formattedMessage = await formatResponseWithGPT(userMessage, results, conversationContext);
      
      const responseType = operationsToExecute.length === 1 ? 'single_step' : 'multi_step';
      
      return new Response(JSON.stringify({
        message: formattedMessage,
        timestamp: new Date().toISOString(),
        type: responseType,
        data: {
          operations: operationsToExecute.length,
          results
        }
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // No operations to execute
    const response = {
      message: "I understand your request but couldn't determine what action to take. Please try rephrasing your question.",
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
    console.error('[chat-response] Error:', err);
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