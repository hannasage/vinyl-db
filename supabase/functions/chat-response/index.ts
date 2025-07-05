// @ts-nocheck
import { createClient } from 'jsr:@supabase/supabase-js@2'
import OpenAI from 'npm:openai@4.20.1'
import { MCPClient, MCPTool, createMCPClient } from '../shared/mcp-utils.ts'

// Operation interface
interface Operation {
  tool: string;
  parameters: any;
  description: string;
  requiresConfirmation?: boolean;
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
5. IMPORTANT: For add/remove operations, mark them as requiring confirmation

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
- vinyl_add_album: Add album to collection (REQUIRES CONFIRMATION)
- vinyl_remove_album: Remove album from collection (REQUIRES CONFIRMATION)

Response format (JSON only):
{
  "operations": [
    {
      "tool": "tool_name",
      "parameters": { /* tool parameters */ },
      "description": "What this operation does",
      "requiresConfirmation": true/false
    }
  ]
}

Examples:
- "Do I have Dark Side of the Moon?" → {"operations": [{"tool": "vinyl_collection_query", "parameters": {"albumName": "Dark Side of the Moon"}, "description": "Check for Dark Side of the Moon", "requiresConfirmation": false}]}
- "Add Dark Side of the Moon by Pink Floyd" → {"operations": [{"tool": "vinyl_add_album", "parameters": {"albumName": "Dark Side of the Moon", "artistName": "Pink Floyd"}, "description": "Add Dark Side of the Moon by Pink Floyd", "requiresConfirmation": true}]}
- "Remove Abbey Road from my collection" → {"operations": [{"tool": "vinyl_remove_album", "parameters": {"albumName": "Abbey Road"}, "description": "Remove Abbey Road from collection", "requiresConfirmation": true}]}

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
      let resultSummary = '';
      
      if (execResult.success) {
        if (execResult.result.message) {
          resultSummary = execResult.result.message;
          
          // For collection queries, include detailed album information
          if (execResult.operation.tool === 'vinyl_collection_query' && execResult.result.albums) {
            resultSummary += '\n   Albums found:';
            execResult.result.albums.forEach((album: any, albumIndex: number) => {
              resultSummary += `\n   ${albumIndex + 1}. "${album.title}" by ${album.artist_name}`;
              if (album.variant) {
                resultSummary += ` (${album.variant})`;
              }
              if (album.release_year) {
                resultSummary += ` [${album.release_year}]`;
              }
            });
          }
        } else {
          resultSummary = JSON.stringify(execResult.result);
        }
      } else {
        resultSummary = execResult.error || 'Failed';
      }
      
      return `${index + 1}. ${status} ${execResult.operation.description}
   Tool: ${execResult.operation.tool}
   Parameters: ${JSON.stringify(execResult.operation.parameters)}
   Result: ${resultSummary}`;
    }).join('\n\n');

    const systemPrompt = `You are an assistant for a vinyl record collection management system. Your job is to format responses to user questions based on the tasks that were executed and their results.

IMPORTANT GUIDELINES:
1. Be strictly factual and concise in your responses
2. Do NOT add any conversational commentary, opinions, or follow-up questions
3. Do NOT use emojis
4. Format album titles in quotes: "Dark Side of the Moon"
5. Include artist names when relevant
6. For collection queries, clearly state what was found or not found
7. For batch operations, summarize the overall results
8. If there were errors, explain them clearly but briefly
9. Keep responses as short as possible while still being clear
10. CRITICAL: Use ONLY the exact album titles and details provided in the task results. Do NOT make up, guess, or hallucinate album names, variants, or other details.

${conversationContext ? `CONVERSATION CONTEXT:
${conversationContext}

Use this context only to resolve references, not for commentary.` : ''}

RESPONSE FORMATS:
- Collection queries: "Yes! You have [album] by [artist]" or "No, you don't have [album] by [artist]"
- Multiple results: "Found X albums: [list with bullet points using exact titles from results]"
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
    const mcpClient = createMCPClient(supabaseUrl);
    
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
      const executionResults = await executeOperations(operationsToExecute, mcpClient, authToken!, userMessage);
      
      // Format response using GPT
      const formattedMessage = await formatResponseWithGPT(userMessage, executionResults, conversationContext);
      
      // Determine response type based on number of operations
      const responseType = operationsToExecute.length === 1 ? 'single_step' : 'multi_step';
      
      return new Response(JSON.stringify({
        message: formattedMessage,
        timestamp: new Date().toISOString(),
        type: responseType,
        data: {
          operations: operationsToExecute.length,
          results: executionResults
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