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

// Multi-step execution plan interface
interface ExecutionStep {
  tool: string;
  parameters: any;
  description: string;
}

interface ExecutionPlan {
  steps: ExecutionStep[];
  summary: string;
  estimatedSteps: number;
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
    const { data, error } = await supabase.functions.invoke('query-collection', {
      body: { albumName, artistName }
    });
    if (error) {
      throw error;
    }
    return data;
  }
};

// Add Album Tool
const addAlbumTool: Tool = {
  name: 'add_album',
  description: 'Add a new album to the user\'s vinyl collection',
  parameters: {
    albumName: 'string',
    artistName: 'string',
    releaseYear: 'number (optional)',
    variant: 'string (optional)',
    purchaseDate: 'string (optional)',
    acquiredDate: 'string (optional)',
    preordered: 'boolean (optional)',
    artworkUrl: 'string (optional)',
    size: 'number (optional)'
  },
  execute: async (params: any, supabase: any) => {
    const { data, error } = await supabase.functions.invoke('add-album', {
      body: params
    });
    if (error) {
      throw error;
    }
    return data;
  }
};

// Tool registry for easy extension
const tools: Record<string, Tool> = {
  collection_query: collectionQueryTool,
  add_album: addAlbumTool
};

// Function to plan multi-step operations using GPT
async function planMultiStepOperation(message: string): Promise<ExecutionPlan | null> {
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return null;
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Build tool descriptions dynamically
    const toolDescriptions = Object.values(tools).map(tool => 
      `- "${tool.name}": ${tool.description}`
    ).join('\n');

    const systemPrompt = `You are a helpful assistant that plans multi-step operations for vinyl collection management.

Your job is to:
1. Analyze if the user's request requires multiple steps
2. Break down complex operations into sequential tool calls
3. Create an execution plan with clear steps

Available tools:
${toolDescriptions}

Multi-step scenarios to detect:
- Batch queries: "Do I have these albums: Dark Side of the Moon, Abbey Road, The Wall?"
- Batch operations: "Add these albums to my collection: [list]"
- Complex queries: "Check if I have any Pink Floyd or Beatles albums"

IMPORTANT: Use exact parameter names as defined in the tool descriptions:
- collection_query: albumName (optional), artistName (optional)
- add_album: albumName, artistName, releaseYear (optional), variant (optional), purchaseDate (optional), acquiredDate (optional), preordered (optional), artworkUrl (optional), size (optional)

Response format (JSON only):
{
  "isMultiStep": true/false,
  "plan": {
    "steps": [
      {
        "tool": "tool_name",
        "parameters": { /* tool parameters with exact names */ },
        "description": "What this step does"
      }
    ],
    "summary": "Brief description of the overall operation",
    "estimatedSteps": number
  }
}

If the request is simple (single tool call), return:
{
  "isMultiStep": false,
  "plan": null
}

Examples:
- "Do I have Dark Side of the Moon?" → {"isMultiStep": false, "plan": null}
- "Do I have these albums: Dark Side of the Moon, Abbey Road?" → {"isMultiStep": true, "plan": { "steps": [{"tool": "collection_query", "parameters": {"albumName": "Dark Side of the Moon"}, "description": "Check for Dark Side of the Moon"}, {"tool": "collection_query", "parameters": {"albumName": "Abbey Road"}, "description": "Check for Abbey Road"}], "summary": "Check collection status for multiple albums", "estimatedSteps": 2 }}
- "Do I have any Pink Floyd albums?" → {"isMultiStep": true, "plan": { "steps": [{"tool": "collection_query", "parameters": {"artistName": "Pink Floyd"}, "description": "Check for albums by Pink Floyd"}], "summary": "Check collection status for Pink Floyd albums", "estimatedSteps": 1 }}
- "Add these albums to my collection: Dark Side of the Moon by Pink Floyd, Abbey Road by The Beatles" → {"isMultiStep": true, "plan": { "steps": [{"tool": "add_album", "parameters": {"albumName": "Dark Side of the Moon", "artistName": "Pink Floyd"}, "description": "Add Dark Side of the Moon by Pink Floyd"}, {"tool": "add_album", "parameters": {"albumName": "Abbey Road", "artistName": "The Beatles"}, "description": "Add Abbey Road by The Beatles"}], "summary": "Add multiple albums to collection", "estimatedSteps": 2 }}

Only return JSON, no other text.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.1,
      max_tokens: 500
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      return null;
    }

    const parsed = JSON.parse(content);
    
    if (parsed.isMultiStep && parsed.plan) {
      return parsed.plan;
    }

    return null;
  } catch (error) {
    console.error('Error planning multi-step operation:', error);
    return null;
  }
}

// Function to execute a single step
async function executeStep(step: ExecutionStep, supabase: any, userMessage: string) {
  const tool = tools[step.tool];
  
  if (!tool) {
    throw new Error(`Unknown tool: ${step.tool}`);
  }

  try {
    const result = await tool.execute(step.parameters, supabase);
    return {
      success: true,
      result,
      step: step.description
    };
  } catch (error) {
    console.error(`Step execution error for ${step.tool}:`, error);
    return {
      success: false,
      error: error.message,
      step: step.description
    };
  }
}

// Function to execute multi-step plan
async function executeMultiStepPlan(plan: ExecutionPlan, supabase: any, userMessage: string) {
  const results = [];
  const errors = [];
  
  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    console.log(`Executing step ${i + 1}/${plan.steps.length}: ${step.description}`);
    
    const stepResult = await executeStep(step, supabase, userMessage);
    
    if (stepResult.success) {
      results.push(stepResult);
    } else {
      errors.push(stepResult);
    }
  }
  
  return {
    completed: results.length,
    total: plan.steps.length,
    results,
    errors,
    summary: plan.summary
  };
}

// Function to format multi-step results
function formatMultiStepResponse(executionResult: any) {
  const { completed, total, results, errors, summary } = executionResult;
  
  if (errors.length === 0) {
    // All steps succeeded
    const albumResults = results.map(r => r.result).filter(r => r.found);
    const notFound = results.map(r => r.result).filter(r => !r.found);
    
    let message = `✅ Completed ${summary}\n\n`;
    
    if (albumResults.length > 0) {
      message += `**Found in your collection:**\n`;
      albumResults.forEach(result => {
        result.albums.forEach(album => {
          message += `• "${album.title}" by ${album.artist_name}\n`;
        });
      });
    }
    
    if (notFound.length > 0) {
      message += `\n**Not in your collection:**\n`;
      notFound.forEach(result => {
        message += `• ${result.message}\n`;
      });
    }
    
    return {
      message,
      type: 'multi_step_success',
      data: executionResult
    };
  } else {
    // Some steps failed
    let message = `⚠️ Partially completed ${summary}\n\n`;
    message += `✅ Completed: ${completed}/${total} steps\n`;
    message += `❌ Failed: ${errors.length} steps\n\n`;
    
    if (results.length > 0) {
      message += `**Successful results:**\n`;
      results.forEach(r => {
        if (r.result.found) {
          r.result.albums.forEach(album => {
            message += `• "${album.title}" by ${album.artist_name}\n`;
          });
        }
      });
    }
    
    if (errors.length > 0) {
      message += `\n**Errors:**\n`;
      errors.forEach(e => {
        message += `• ${e.step}: ${e.error}\n`;
      });
    }
    
    return {
      message,
      type: 'multi_step_partial',
      data: executionResult
    };
  }
}

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
async function executeTool(toolName: string, parameters: any, supabase: any, userMessage: string) {
  const tool = tools[toolName];
  
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  try {
    return await tool.execute(parameters, supabase);
  } catch (error) {
    console.error(`Tool execution error for ${toolName}:`, error);
    throw error;
  }
}

// Function to format response based on tool result
function formatToolResponse(toolName: string, result: any) {
  switch (toolName) {
    case 'collection_query':
      return formatCollectionResponse(result);
    case 'add_album':
      return formatAddAlbumResponse(result);
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

// Function to format add album response
function formatAddAlbumResponse(result: any) {
  if (!result.success) {
    return {
      message: `❌ ${result.message}`,
      type: 'add_album_failed',
      data: result
    };
  }

  const album = result.album;
  const variantInfo = album.variant ? ` (${album.variant})` : '';
  const yearInfo = album.release_year ? ` (${album.release_year})` : '';
  
  return {
    message: `✅ ${result.message}${variantInfo}${yearInfo}`,
    type: 'add_album_success',
    data: result
  };
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

    // First, check if this is a multi-step operation
    const multiStepPlan = await planMultiStepOperation(userMessage);
    
    if (multiStepPlan) {
      // Execute multi-step plan
      console.log('Executing multi-step plan:', multiStepPlan);
      const executionResult = await executeMultiStepPlan(multiStepPlan, supabase, userMessage);
      const formattedResponse = formatMultiStepResponse(executionResult);
      
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
    }

    // Parse the message using GPT for single-step operations
    const parsedMessage = await parseMessageWithGPT(userMessage);
    console.log('GPT parsing result:', parsedMessage);

    // Handle based on the determined tool
    if (parsedMessage.tool && parsedMessage.tool !== 'general' && tools[parsedMessage.tool]) {
      // Execute the specified tool
      try {
        const toolResult = await executeTool(parsedMessage.tool, parsedMessage.parameters, supabase, userMessage);
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