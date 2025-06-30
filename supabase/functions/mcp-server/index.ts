// @ts-nocheck
import { createClient } from 'jsr:@supabase/supabase-js@2'

// MCP Protocol Types
interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

// MCP Server Configuration
const MCP_SERVER_INFO = {
  name: 'vinyl-collection-mcp-server',
  version: '1.0.0',
  capabilities: {
    tools: {},
    resources: {
      listChanged: false
    }
  }
};

// Tool Definitions
const MCP_TOOLS: Record<string, MCPTool> = {
  vinyl_collection_query: {
    name: 'vinyl_collection_query',
    description: 'Query the user\'s vinyl collection for albums by artist, album name, or both',
    inputSchema: {
      type: 'object',
      properties: {
        albumName: {
          type: 'string',
          description: 'Album name to search for (optional)'
        },
        artistName: {
          type: 'string',
          description: 'Artist name to search for (optional)'
        }
      }
    }
  },
  vinyl_add_album: {
    name: 'vinyl_add_album',
    description: 'Add a new album to the user\'s vinyl collection',
    inputSchema: {
      type: 'object',
      properties: {
        albumName: {
          type: 'string',
          description: 'Album name (required)'
        },
        artistName: {
          type: 'string',
          description: 'Artist name (required)'
        },
        releaseYear: {
          type: 'number',
          description: 'Release year (optional)'
        },
        variant: {
          type: 'string',
          description: 'Album variant (optional)'
        },
        purchaseDate: {
          type: 'string',
          description: 'Purchase date in YYYY-MM-DD format (optional)'
        },
        acquiredDate: {
          type: 'string',
          description: 'Acquired date in YYYY-MM-DD format (optional)'
        },
        preordered: {
          type: 'boolean',
          description: 'Whether the album was preordered (optional)'
        },
        artworkUrl: {
          type: 'string',
          description: 'URL to album artwork (optional)'
        },
        size: {
          type: 'number',
          description: 'Record size in inches (optional)'
        }
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
        albumId: {
          type: 'number',
          description: 'Album ID (optional)'
        },
        albumName: {
          type: 'string',
          description: 'Album name (optional)'
        },
        artistName: {
          type: 'string',
          description: 'Artist name (optional)'
        }
      }
    }
  }
};

// Resource Definitions
const MCP_RESOURCES: Record<string, MCPResource> = {
  albums: {
    uri: 'vinyl://albums',
    name: 'Vinyl Albums',
    description: 'Collection of vinyl albums',
    mimeType: 'application/json'
  },
  artists: {
    uri: 'vinyl://artists',
    name: 'Artists',
    description: 'Collection of artists',
    mimeType: 'application/json'
  },
  entries: {
    uri: 'vinyl://entries',
    name: 'Collection Entries',
    description: 'Collection entries',
    mimeType: 'application/json'
  }
};

// Tool Execution Functions
async function executeVinylCollectionQuery(params: any, supabase: any) {
  const { albumName, artistName } = params;
  
  console.log('[MCP] Executing vinyl_collection_query with params:', params);
  
  const { data, error } = await supabase.functions.invoke('query-collection', {
    body: { albumName, artistName }
  });
  
  if (error) {
    throw new Error(`Collection query failed: ${error.message}`);
  }
  
  return data;
}

async function executeVinylAddAlbum(params: any, supabase: any) {
  console.log('[MCP] Executing vinyl_add_album with params:', params);
  
  const { data, error } = await supabase.functions.invoke('add-album', {
    body: params
  });
  
  if (error) {
    throw new Error(`Add album failed: ${error.message}`);
  }
  
  return data;
}

async function executeVinylRemoveAlbum(params: any, supabase: any) {
  console.log('[MCP] Executing vinyl_remove_album with params:', params);
  
  const { data, error } = await supabase.functions.invoke('remove-album', {
    body: params
  });
  
  if (error) {
    throw new Error(`Remove album failed: ${error.message}`);
  }
  
  return data;
}

// Tool execution mapping
const TOOL_EXECUTORS: Record<string, (params: any, supabase: any) => Promise<any>> = {
  vinyl_collection_query: executeVinylCollectionQuery,
  vinyl_add_album: executeVinylAddAlbum,
  vinyl_remove_album: executeVinylRemoveAlbum
};

// MCP Method Handlers
function handleInitialize(request: MCPRequest): MCPResponse {
  console.log('[MCP] Handling initialize request');
  
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      protocolVersion: '2024-11-05',
      capabilities: MCP_SERVER_INFO.capabilities,
      serverInfo: MCP_SERVER_INFO
    }
  };
}

function handleToolsList(request: MCPRequest): MCPResponse {
  console.log('[MCP] Handling tools/list request');
  
  const tools = Object.values(MCP_TOOLS).map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema
  }));
  
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: { tools }
  };
}

async function handleToolsCall(request: MCPRequest, supabase: any): Promise<MCPResponse> {
  const { name, arguments: args } = request.params;
  
  console.log('[MCP] Handling tools/call request for tool:', name);
  
  try {
    // Validate tool exists
    if (!MCP_TOOLS[name]) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32601,
          message: `Tool '${name}' not found`
        }
      };
    }
    
    // Validate tool executor exists
    if (!TOOL_EXECUTORS[name]) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: `Tool executor for '${name}' not found`
        }
      };
    }
    
    // Execute tool
    const result = await TOOL_EXECUTORS[name](args, supabase);
    
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      }
    };
  } catch (error) {
    console.error('[MCP] Tool execution error:', error);
    
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32603,
        message: `Tool execution failed: ${error.message}`,
        data: { tool: name }
      }
    };
  }
}

function handleResourcesList(request: MCPRequest): MCPResponse {
  console.log('[MCP] Handling resources/list request');
  
  const resources = Object.values(MCP_RESOURCES);
  
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: { resources }
  };
}

async function handleResourcesRead(request: MCPRequest, supabase: any): Promise<MCPResponse> {
  const { uri } = request.params;
  
  console.log('[MCP] Handling resources/read request for URI:', uri);
  
  try {
    let data;
    
    if (uri.startsWith('vinyl://albums/')) {
      const albumId = uri.split('/').pop();
      const { data: album, error } = await supabase
        .from('album')
        .select(`
          *,
          artist:artist_id(name)
        `)
        .eq('id', albumId)
        .single();
      
      if (error) throw error;
      data = album;
    } else if (uri.startsWith('vinyl://artists/')) {
      const artistId = uri.split('/').pop();
      const { data: artist, error } = await supabase
        .from('artist')
        .select('*')
        .eq('id', artistId)
        .single();
      
      if (error) throw error;
      data = artist;
    } else if (uri.startsWith('vinyl://entries/')) {
      const entryId = uri.split('/').pop();
      const { data: entry, error } = await supabase
        .from('entry')
        .select('*')
        .eq('id', entryId)
        .single();
      
      if (error) throw error;
      data = entry;
    } else {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32601,
          message: `Resource '${uri}' not found`
        }
      };
    }
    
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(data, null, 2)
          }
        ]
      }
    };
  } catch (error) {
    console.error('[MCP] Resource read error:', error);
    
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32603,
        message: `Resource read failed: ${error.message}`,
        data: { uri }
      }
    };
  }
}

// Main MCP Server Handler
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

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Parse request
    const request: MCPRequest = await req.json();
    console.log('[MCP] Received request:', request);

    // Validate JSON-RPC format
    if (request.jsonrpc !== '2.0' || !request.id || !request.method) {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: request.id || null,
        error: {
          code: -32600,
          message: 'Invalid Request'
        }
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Route request to appropriate handler
    let response: MCPResponse;

    switch (request.method) {
      case 'initialize':
        response = handleInitialize(request);
        break;
      case 'tools/list':
        response = handleToolsList(request);
        break;
      case 'tools/call':
        response = await handleToolsCall(request, supabase);
        break;
      case 'resources/list':
        response = handleResourcesList(request);
        break;
      case 'resources/read':
        response = await handleResourcesRead(request, supabase);
        break;
      default:
        response = {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32601,
            message: `Method '${request.method}' not found`
          }
        };
    }

    console.log('[MCP] Sending response:', response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[MCP] Server error:', error);
    
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error.message
      }
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}); 