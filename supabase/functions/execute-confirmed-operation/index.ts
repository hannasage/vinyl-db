// @ts-nocheck
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { MCPClient, createMCPClient } from '../shared/mcp-utils.ts'

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
    const operationId = requestData.operationId;
    const originalOperation = requestData.originalOperation;
    
    if (!operationId || !originalOperation) {
      return new Response(JSON.stringify({ 
        error: 'Missing required parameters',
        message: 'operationId and originalOperation are required'
      }), { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    console.log('[execute-confirmed-operation] Executing confirmed operation:', {
      operationId,
      tool: originalOperation.tool,
      parameters: originalOperation.parameters
    });

    // Create MCP client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const mcpClient = createMCPClient(supabaseUrl);
    
    // Get auth token
    const authToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    
    // Execute the confirmed operation
    const result = await mcpClient.executeTool(
      originalOperation.tool, 
      originalOperation.parameters, 
      authToken
    );
    
    console.log('[execute-confirmed-operation] Operation completed successfully:', result);
    
    const response = {
      success: true,
      message: `Successfully ${originalOperation.tool === 'vinyl_add_album' ? 'added' : 'removed'} "${originalOperation.parameters.albumName}" from your collection.`,
      timestamp: new Date().toISOString(),
      data: result
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err) {
    console.error('[execute-confirmed-operation] Error:', err);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: err?.message || 'Unknown error',
      success: false
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}); 