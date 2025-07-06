// @ts-nocheck
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { OpenAI } from 'jsr:@openai/openai@4'
import { MCPClient, MCPTool, createMCPClient } from '../shared/mcp-utils.ts'

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

interface AgentState {
  originalQuestion: string;
  conversationContext?: string;
  executedOperations: ExecutionResult[];
  pendingOperations: Operation[];
  failedOperations: ExecutionResult[];
  maxRetries: number;
  maxIterations: number;
  currentIteration: number;
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
- For fetching artwork, use fetch_album_artwork
- For fetching album details, use fetch_album_details
- For parsing image text, use parse_image_text
- For uploading images, use upload_image
- For executing confirmed operations, use execute_confirmed_operation

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

User: "Do I have Jane Remover?"
Response: {
  "operations": [
    {
      "tool": "vinyl_collection_query",
      "parameters": { "artistName": "Jane Remover" },
      "description": "Query collection for albums by Jane Remover",
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

User: "Do I have these albums: Dark Side of the Moon, Abbey Road, and Led Zeppelin IV?"
Response: {
  "operations": [
    {
      "tool": "vinyl_collection_query",
      "parameters": { "albumName": "Dark Side of the Moon" },
      "description": "Query collection for Dark Side of the Moon",
      "requiresConfirmation": false
    },
    {
      "tool": "vinyl_collection_query",
      "parameters": { "albumName": "Abbey Road" },
      "description": "Query collection for Abbey Road",
      "requiresConfirmation": false
    },
    {
      "tool": "vinyl_collection_query",
      "parameters": { "albumName": "Led Zeppelin IV" },
      "description": "Query collection for Led Zeppelin IV",
      "requiresConfirmation": false
    }
  ]
}

Now analyze this user request: "${message}"

Return only the JSON object with the operations array.`;

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
async function executeOperation(operation: Operation, mcpClient: MCPClient, authToken: string): Promise<{success: boolean, result: any, error?: string, shouldRetryWithAlternative?: boolean}> {
  console.log(`[chat-response] Executing operation: ${operation.tool} with params:`, operation.parameters);
  
  try {
    const result = await mcpClient.executeTool(operation.tool, operation.parameters, authToken);
    console.log(`[chat-response] Tool ${operation.tool} returned result:`, result);
    
    // Check if this is a collection query that returned no results
    if (operation.tool === 'vinyl_collection_query' && result.found === false) {
      // Determine if we should try alternative search
      const hasAlbumName = operation.parameters.albumName && !operation.parameters.artistName;
      const hasArtistName = operation.parameters.artistName && !operation.parameters.albumName;
      
      if (hasAlbumName) {
        // If we searched by album name and found nothing, try searching by artist name
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
        // If we searched by artist name and found nothing, try searching by album name
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

// Function to prioritize operations based on dependencies and importance
function prioritizeOperations(operations: Operation[]): Operation[] {
  // Create a copy to avoid mutating the original array
  const prioritized = [...operations];
  
  // Sort operations by priority:
  // 1. Queries first (they don't modify state)
  // 2. Add operations (they create new data)
  // 3. Remove operations (they delete data)
  // 4. Other operations
  
  const priorityOrder = {
    'vinyl_collection_query': 1,
    'fetch_album_artwork': 2,
    'fetch_album_details': 2,
    'parse_image_text': 2,
    'upload_image': 3,
    'vinyl_add_album': 4,
    'vinyl_remove_album': 5,
    'execute_confirmed_operation': 6
  };

  return prioritized.sort((a, b) => {
    const priorityA = priorityOrder[a.tool] || 10;
    const priorityB = priorityOrder[b.tool] || 10;
    return priorityA - priorityB;
  });
}

// Function to check if operations have dependencies
function checkOperationDependencies(operations: Operation[]): Map<string, string[]> {
  const dependencies = new Map<string, string[]>();
  
  for (const operation of operations) {
    const deps: string[] = [];
    
    // Check if this operation depends on previous operations
    if (operation.tool === 'vinyl_add_album' && operation.parameters.artworkUrl) {
      // Add album operation with artwork might depend on artwork fetch
      deps.push('fetch_album_artwork');
    }
    
    if (operation.tool === 'execute_confirmed_operation') {
      // Confirmed operations depend on the original operation being planned
      deps.push('vinyl_add_album', 'vinyl_remove_album');
    }
    
    dependencies.set(operation.tool, deps);
  }
  
  return dependencies;
}

// Function to analyze failures and plan recovery strategies
async function analyzeFailuresAndPlanRecovery(
  failedOperations: ExecutionResult[],
  originalQuestion: string,
  conversationContext?: string
): Promise<Operation[]> {
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return [];
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    const failureSummary = failedOperations.map(failure => 
      `- ${failure.operation.description} (${failure.operation.tool}): ${failure.error}`
    ).join('\n');

    const systemPrompt = `You are an intelligent agent that analyzes operation failures and plans recovery strategies.

Your job is to:
1. Analyze the failed operations and their error messages
2. Determine if the failures are recoverable
3. Plan alternative approaches or retry strategies
4. Return new operations that might succeed where the previous ones failed

FAILED OPERATIONS:
${failureSummary}

ORIGINAL USER REQUEST: "${originalQuestion}"

${conversationContext ? `CONVERSATION CONTEXT:
${conversationContext}` : ''}

ANALYSIS GUIDELINES:
- If an album query failed due to fuzzy matching, try alternative search strategies
- If an add operation failed due to validation, try with different parameters
- If a tool is unavailable, suggest alternative approaches
- Consider if the user's request can be partially fulfilled
- Don't retry operations that failed due to fundamental issues (e.g., missing required data)

RECOVERY STRATEGIES:
1. **Fuzzy Matching Issues**: Try broader searches or different parameter combinations
2. **Validation Errors**: Adjust parameters based on error messages
3. **Tool Unavailability**: Use alternative tools or approaches
4. **Partial Success**: Focus on what can be accomplished

Return a JSON object with recovery operations:
{
  "recovery_operations": [
    {
      "tool": "tool_name",
      "parameters": { "param1": "value1" },
      "description": "Recovery strategy description",
      "requiresConfirmation": false
    }
  ]
}

Only return operations that have a reasonable chance of success. If no recovery is possible, return an empty array.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt }
      ],
      temperature: 0.1,
      max_tokens: 300
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      return [];
    }

    const parsed = JSON.parse(content);
    
    if (parsed.recovery_operations && Array.isArray(parsed.recovery_operations)) {
      return parsed.recovery_operations;
    }

    return [];
  } catch (error) {
    console.error('Error analyzing failures and planning recovery:', error);
    return [];
  }
}

// Function to determine if the agent should continue or stop
async function shouldContinueExecution(
  agentState: AgentState,
  mcpClient: MCPClient,
  authToken: string
): Promise<{continue: boolean, reason: string}> {
  // Check iteration limits
  if (agentState.currentIteration >= agentState.maxIterations) {
    return { continue: false, reason: 'Maximum iterations reached' };
  }

  // Check if we have pending operations
  if (agentState.pendingOperations.length > 0) {
    return { continue: true, reason: 'Operations pending' };
  }

  // Check if we have failed operations that might be recoverable
  if (agentState.failedOperations.length > 0) {
    // Analyze failures and see if recovery is possible
    const recoveryOperations = await analyzeFailuresAndPlanRecovery(
      agentState.failedOperations,
      agentState.originalQuestion,
      agentState.conversationContext
    );

    if (recoveryOperations.length > 0) {
      agentState.pendingOperations = recoveryOperations;
      return { continue: true, reason: 'Recovery operations planned' };
    }
  }

  return { continue: false, reason: 'No more operations to execute' };
}

// Function to generate execution analytics
function generateExecutionAnalytics(
  executionResults: ExecutionResult[],
  agentState: AgentState
): any {
  const successful = executionResults.filter(r => r.success);
  const failed = executionResults.filter(r => !r.success);
  
  const toolStats = new Map<string, { success: number; failed: number; total: number }>();
  
  // Calculate statistics per tool
  for (const result of executionResults) {
    const tool = result.operation.tool;
    const current = toolStats.get(tool) || { success: 0, failed: 0, total: 0 };
    
    if (result.success) {
      current.success++;
    } else {
      current.failed++;
    }
    current.total++;
    
    toolStats.set(tool, current);
  }
  
  // Calculate retry statistics
  const retryStats = executionResults.reduce((acc, result) => {
    const retries = result.retryCount || 0;
    acc.totalRetries += retries;
    acc.maxRetries = Math.max(acc.maxRetries, retries);
    return acc;
  }, { totalRetries: 0, maxRetries: 0 });
  
  return {
    summary: {
      totalOperations: executionResults.length,
      successfulOperations: successful.length,
      failedOperations: failed.length,
      successRate: executionResults.length > 0 ? (successful.length / executionResults.length * 100).toFixed(1) + '%' : '0%',
      iterations: agentState.currentIteration,
      maxIterations: agentState.maxIterations
    },
    toolBreakdown: Object.fromEntries(toolStats),
    retryStatistics: retryStats,
    executionTime: {
      iterations: agentState.currentIteration,
      averageOperationsPerIteration: agentState.currentIteration > 0 ? 
        (executionResults.length / agentState.currentIteration).toFixed(2) : '0'
    },
    failureAnalysis: failed.map(f => ({
      tool: f.operation.tool,
      description: f.operation.description,
      error: f.error,
      retryCount: f.retryCount
    }))
  };
}

// Enhanced agent cycle with adaptive execution
async function executeAgentCycle(
  originalQuestion: string,
  initialOperations: Operation[],
  mcpClient: MCPClient,
  authToken: string,
  conversationContext?: string
): Promise<{results: ExecutionResult[], analytics: any}> {
  const agentState: AgentState = {
    originalQuestion,
    conversationContext,
    executedOperations: [],
    pendingOperations: prioritizeOperations(initialOperations), // Prioritize operations
    failedOperations: [],
    maxRetries: 2,
    maxIterations: 5,
    currentIteration: 0
  };

  console.log(`[Agent Cycle] Starting execution with ${initialOperations.length} initial operations`);
  console.log(`[Agent Cycle] Operation priorities:`, agentState.pendingOperations.map(op => `${op.tool}: ${op.description}`));

  while (true) {
    agentState.currentIteration++;
    console.log(`[Agent Cycle] Iteration ${agentState.currentIteration}/${agentState.maxIterations}`);

    // Check if we should continue
    const shouldContinue = await shouldContinueExecution(agentState, mcpClient, authToken);
    if (!shouldContinue.continue) {
      console.log(`[Agent Cycle] Stopping execution: ${shouldContinue.reason}`);
      break;
    }

    // Execute pending operations
    const currentOperations = [...agentState.pendingOperations];
    agentState.pendingOperations = [];

    console.log(`[Agent Cycle] Executing ${currentOperations.length} operations in iteration ${agentState.currentIteration}`);

    for (const operation of currentOperations) {
      const result = await executeOperation(operation, mcpClient, authToken);
      const executionResult: ExecutionResult = {
        operation,
        success: result.success,
        result: result.result,
        error: result.error,
        retryCount: agentState.failedOperations.filter(f => 
          f.operation.tool === operation.tool && 
          JSON.stringify(f.operation.parameters) === JSON.stringify(operation.parameters)
        ).length,
        shouldRetryWithAlternative: result.shouldRetryWithAlternative,
        alternativeSearch: result.alternativeSearch
      };

      if (result.success) {
        agentState.executedOperations.push(executionResult);
        console.log(`[Agent Cycle] Operation succeeded: ${operation.description}`);
        
        // Check if this operation suggests an alternative search
        if (result.shouldRetryWithAlternative && result.alternativeSearch) {
          console.log(`[Agent Cycle] Adding alternative search operation: ${result.alternativeSearch.description}`);
          agentState.pendingOperations.push(result.alternativeSearch);
        }
        
        // Check if this success enables any dependent operations
        // For example, if we successfully fetched artwork, we might want to add the album
        if (operation.tool === 'fetch_album_artwork' && operation.result?.url) {
          // Look for pending add operations that could use this artwork
          const pendingAddOps = agentState.pendingOperations.filter(op => 
            op.tool === 'vinyl_add_album' && 
            op.parameters.albumName === operation.parameters.albumName &&
            op.parameters.artistName === operation.parameters.artistName
          );
          
          for (const addOp of pendingAddOps) {
            addOp.parameters.artworkUrl = operation.result.url;
            console.log(`[Agent Cycle] Updated add operation with artwork URL: ${addOp.description}`);
          }
        }
      } else {
        // Check if we should retry this operation
        if (executionResult.retryCount! < agentState.maxRetries) {
          console.log(`[Agent Cycle] Operation failed, will retry (attempt ${executionResult.retryCount! + 1}/${agentState.maxRetries}): ${operation.description}`);
          agentState.pendingOperations.push(operation);
        } else {
          console.log(`[Agent Cycle] Operation failed permanently after ${agentState.maxRetries} attempts: ${operation.description}`);
          agentState.failedOperations.push(executionResult);
        }
      }
    }

    // If no operations were executed in this iteration, break to avoid infinite loops
    if (currentOperations.length === 0) {
      console.log(`[Agent Cycle] No operations executed in this iteration, stopping`);
      break;
    }
  }

  const allResults = [...agentState.executedOperations, ...agentState.failedOperations];
  const analytics = generateExecutionAnalytics(allResults, agentState);
  
  console.log(`[Agent Cycle] Execution completed. Success: ${agentState.executedOperations.length}, Failed: ${agentState.failedOperations.length}`);
  console.log(`[Agent Cycle] Analytics:`, analytics.summary);
  
  return {
    results: allResults,
    analytics
  };
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
      
      // Add context about alternative searches
      let searchContext = '';
      if (execResult.operation.description.includes('(alternative search)')) {
        searchContext = ' [Alternative search]';
      }
      
      return `${index + 1}. ${status} ${execResult.operation.description}${searchContext}
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
11. If alternative searches were performed, acknowledge this in your response

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
      const { results, analytics } = await executeAgentCycle(userMessage, operationsToExecute, mcpClient, authToken!, conversationContext);
      
      // Format response using GPT
      const formattedMessage = await formatResponseWithGPT(userMessage, results, conversationContext);
      
      // Determine response type based on number of operations
      const responseType = operationsToExecute.length === 1 ? 'single_step' : 'multi_step';
      
      return new Response(JSON.stringify({
        message: formattedMessage,
        timestamp: new Date().toISOString(),
        type: responseType,
        data: {
          operations: operationsToExecute.length,
          results,
          analytics
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