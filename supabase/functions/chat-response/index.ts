// @ts-nocheck
import { createClient } from 'jsr:@supabase/supabase-js@2'
import OpenAI from 'npm:openai@4.20.1'

// MCP Client Types
interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

// MCP Client Class (simplified for Edge Function)
class MCPClient {
  private serverUrl: string;
  private requestId = 0;
  private tools: MCPTool[] = [];
  private initialized = false;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestId}`;
  }

  private async makeRequest(request: any, authToken?: string): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(this.serverUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  async initialize(authToken?: string): Promise<void> {
    console.log('[MCP Client] Initializing connection to MCP server');
    
    const request = {
      jsonrpc: '2.0',
      id: this.generateRequestId(),
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {
            listChanged: false
          }
        },
        clientInfo: {
          name: 'vinyl-agent-mcp-client',
          version: '1.0.0'
        }
      }
    };

    const response = await this.makeRequest(request, authToken);
    
    if (response.error) {
      throw new Error(`MCP initialization failed: ${response.error.message}`);
    }

    console.log('[MCP Client] Successfully initialized MCP connection');
    this.initialized = true;
  }

  async discoverTools(authToken?: string): Promise<MCPTool[]> {
    if (!this.initialized) {
      await this.initialize(authToken);
    }

    console.log('[MCP Client] Discovering available tools');
    
    const request = {
      jsonrpc: '2.0',
      id: this.generateRequestId(),
      method: 'tools/list'
    };

    const response = await this.makeRequest(request, authToken);
    
    if (response.error) {
      throw new Error(`Tool discovery failed: ${response.error.message}`);
    }

    this.tools = response.result?.tools || [];
    console.log('[MCP Client] Discovered tools:', this.tools.map(t => t.name));
    
    return this.tools;
  }

  async executeTool(toolName: string, parameters: Record<string, any>, authToken?: string): Promise<any> {
    if (!this.initialized) {
      await this.initialize(authToken);
    }

    console.log('[MCP Client] Calling tool:', toolName, 'with args:', parameters);
    
    const request = {
      jsonrpc: '2.0',
      id: this.generateRequestId(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: parameters
      }
    };

    const response = await this.makeRequest(request, authToken);
    
    if (response.error) {
      throw new Error(`Tool call failed: ${response.error.message}`);
    }

    const result = response.result;
    console.log('[MCP Client] Tool call successful:', toolName);
    
    // Parse result
    try {
      const textContent = result.content.find((c: any) => c.type === 'text');
      if (textContent) {
        return JSON.parse(textContent.text);
      }
      return result;
    } catch (error) {
      console.warn('[MCP Client] Failed to parse tool result as JSON, returning raw result');
      return result;
    }
  }

  getCachedTools(): MCPTool[] {
    return [...this.tools];
  }

  hasTool(toolName: string): boolean {
    return this.tools.some(tool => tool.name === toolName);
  }
}

// Operation interface
interface Operation {
  tool: string;
  parameters: any;
  description: string;
}

// Function to plan operations using GPT (returns array of operations)
async function planOperations(message: string, mcpTools: MCPTool[], conversationContext?: string): Promise<Operation[]> {
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return [];
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Build tool descriptions from MCP tools
    const toolDescriptions = mcpTools.map(tool => 
      `- "${tool.name}": ${tool.description}`
    ).join('\n');

    const systemPrompt = `You are a helpful assistant that plans operations for vinyl collection management.

Your job is to:
1. Analyze the user's request
2. Consider the conversation context to understand references and maintain continuity
3. Break down complex operations into sequential tool calls
4. Create an array of operations to execute

${conversationContext ? `CONVERSATION CONTEXT:
${conversationContext}

Use this context to understand references like "her new album" or "that artist" and maintain conversation continuity.` : ''}

Available tools:
${toolDescriptions}

Multi-step scenarios to detect:
- Batch queries: "Do I have these albums: Dark Side of the Moon, Abbey Road, The Wall?"
- Batch operations: "Add these albums to my collection: [list]"
- Batch removals: "Remove these albums from my collection: [list]"
- Complex queries: "Check if I have any Pink Floyd or Beatles albums"

IMPORTANT: Use exact tool names as defined in the tool descriptions:
- vinyl_collection_query: Query vinyl collection
- vinyl_add_album: Add album to collection
- vinyl_remove_album: Remove album from collection

Response format (JSON only):
{
  "operations": [
    {
      "tool": "tool_name",
      "parameters": { /* tool parameters */ },
      "description": "What this operation does"
    }
  ]
}

Examples:
- "Do I have Dark Side of the Moon?" → {"operations": [{"tool": "vinyl_collection_query", "parameters": {"albumName": "Dark Side of the Moon"}, "description": "Check for Dark Side of the Moon"}]}
- "Do I have these albums: Dark Side of the Moon, Abbey Road?" → {"operations": [{"tool": "vinyl_collection_query", "parameters": {"albumName": "Dark Side of the Moon"}, "description": "Check for Dark Side of the Moon"}, {"tool": "vinyl_collection_query", "parameters": {"albumName": "Abbey Road"}, "description": "Check for Abbey Road"}]}
- "Add these albums to my collection: Dark Side of the Moon by Pink Floyd, Abbey Road by The Beatles" → {"operations": [{"tool": "vinyl_add_album", "parameters": {"albumName": "Dark Side of the Moon", "artistName": "Pink Floyd"}, "description": "Add Dark Side of the Moon by Pink Floyd"}, {"tool": "vinyl_add_album", "parameters": {"albumName": "Abbey Road", "artistName": "The Beatles"}, "description": "Add Abbey Road by The Beatles"}]}

Only return JSON, no other text.`;

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation context as user messages if available
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

    // Add the current user message
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

// Function to execute a single operation
async function executeOperation(operation: Operation, mcpClient: MCPClient, authToken: string): Promise<{success: boolean, result: any, error?: string}> {
  console.log(`[chat-response] Executing operation: ${operation.tool} with params:`, operation.parameters);
  
  try {
    const result = await mcpClient.executeTool(operation.tool, operation.parameters, authToken);
    console.log(`[chat-response] Tool ${operation.tool} returned result:`, result);
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

// Function to execute array of operations
async function executeOperations(operations: Operation[], mcpClient: MCPClient, authToken: string): Promise<Array<{operation: Operation, success: boolean, result: any, error?: string}>> {
  const results = [];
  
  for (let i = 0; i < operations.length; i++) {
    const operation = operations[i];
    console.log(`Executing operation ${i + 1}/${operations.length}: ${operation.description}`);
    
    const result = await executeOperation(operation, mcpClient, authToken);
    
    results.push({
      operation,
      ...result
    });
  }
  
  return results;
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
      throw new Error('OpenAI API key not configured');
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Prepare task information for GPT
    const taskInfo = executionResults.map((execResult, index) => {
      const status = execResult.success ? '✅' : '❌';
      const resultSummary = execResult.success ? 
        (execResult.result.message || JSON.stringify(execResult.result)) : 
        execResult.error || 'Failed';
      
      return `${index + 1}. ${status} ${execResult.operation.description}
   Tool: ${execResult.operation.tool}
   Parameters: ${JSON.stringify(execResult.operation.parameters)}
   Result: ${resultSummary}`;
    }).join('\n\n');

    const systemPrompt = `You are a helpful assistant for a vinyl record collection management system. Your job is to format responses to user questions based on the tasks that were executed and their results.

IMPORTANT GUIDELINES:
1. Be conversational and natural in your responses
2. Use emojis sparingly but effectively (✅ for success, ❌ for failure, 🎵 for music-related info)
3. Format album titles in quotes: "Dark Side of the Moon"
4. Include artist names when relevant
5. For collection queries, clearly state what was found or not found
6. For batch operations, summarize the overall results
7. If there were errors, explain them clearly but helpfully
8. Keep responses concise but informative
9. Don't repeat technical details like tool names or parameters unless necessary
10. Maintain conversation continuity and refer back to previous context when appropriate

${conversationContext ? `CONVERSATION CONTEXT:
${conversationContext}

Use this context to maintain conversation flow and understand references.` : ''}

RESPONSE FORMATS:
- Collection queries: "Yes! You have [album] by [artist]" or "No, you don't have [album] by [artist]"
- Multiple results: "Found X albums: [list with bullet points]"
- Add operations: "Successfully added [album] by [artist] to your collection"
- Remove operations: "Successfully removed [album] by [artist] from your collection"
- Batch operations: "Completed [operation]: [summary of results]"
- Errors: "Sorry, I couldn't [action] because [reason]"

The user asked: "${originalQuestion}"

Tasks executed:
${taskInfo}

Please provide a natural, helpful response based on this information.`;

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation context as messages if available
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
    // Fallback to basic formatting
    return `I processed your request "${originalQuestion}" but encountered an error formatting the response. Please try again.`;
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
    const conversationContext = requestData.conversationContext || '';
    
    // Log the received data for debugging
    console.log('Received request data:', {
      message: userMessage,
      hasImage: requestData.hasImage || false,
      imageData: requestData.imageData ? `Base64 data (${requestData.imageData.length} chars)` : 'No image data',
      mimeType: requestData.mimeType || 'No mime type',
      contextLength: conversationContext.length
    });

    // Create MCP client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const mcpServerUrl = `${supabaseUrl}/functions/v1/mcp-server`;
    const mcpClient = new MCPClient(mcpServerUrl);
    
    // Get auth token
    const authToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    
    // Discover available tools
    console.log('[chat-response] Discovering MCP tools...');
    const mcpTools = await mcpClient.discoverTools(authToken);
    console.log('[chat-response] Discovered tools:', mcpTools.map(t => t.name));

    // Plan operations with conversation context
    const operations = await planOperations(userMessage, mcpTools, conversationContext);
    
    if (operations.length === 0) {
      // No operations planned - return default response
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

    // Execute all operations
    console.log(`Executing ${operations.length} operation(s):`, operations.map(op => op.description));
    const executionResults = await executeOperations(operations, mcpClient, authToken!, userMessage);
    
    // Format response using GPT
    const formattedMessage = await formatResponseWithGPT(userMessage, executionResults, conversationContext);
    
    // Determine response type based on number of operations
    const responseType = operations.length === 1 ? 'single_step' : 'multi_step';
    
    return new Response(JSON.stringify({
      message: formattedMessage,
      timestamp: new Date().toISOString(),
      type: responseType,
      data: {
        operations: operations.length,
        results: executionResults
      }
    }), {
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