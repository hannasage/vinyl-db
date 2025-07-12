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

// Input validation functions
function validateUserInput(message: string): string {
  if (!message || typeof message !== 'string') return '';
  
  return message
    .trim()
    .replace(/[<>]/g, '') // Remove HTML-like characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 500); // Limit length
}

function validateConversationContext(context: string): string {
  if (!context || typeof context !== 'string') return '';
  
  return context
    .trim()
    .replace(/[<>]/g, '') // Remove HTML-like characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 2000); // Limit length
}

// Conversation summarization function
async function summarizeConversation(context: string, openai: OpenAI): Promise<string> {
  if (!context || context.length < 1000) return context; // Only summarize long contexts
  
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Summarize the conversation context in 2-3 sentences, focusing on key references and user preferences. Return only the summary.'
        },
        {
          role: 'user',
          content: `Summarize this conversation context:\n\n${context}`
        }
      ],
      temperature: 0.1,
      max_tokens: 150
    });

    return completion.choices[0]?.message?.content || context;
  } catch (error) {
    console.error('Error summarizing conversation:', error);
    return context; // Fallback to original context
  }
}

// Context relevance scoring
function calculateContextRelevance(context: string, currentQuery: string): number {
  if (!context || !currentQuery) return 0;
  
  const contextLower = context.toLowerCase();
  const queryLower = currentQuery.toLowerCase();
  
  // Simple relevance scoring based on keyword overlap
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
  const matchingWords = queryWords.filter(word => contextLower.includes(word));
  
  return matchingWords.length / queryWords.length;
}

// AI-powered prompt template selection
async function selectPromptTemplate(query: string, context: string): Promise<'search' | 'add' | 'remove' | 'insights' | 'general'> {
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      // Default to search if no API key available
      return 'search';
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    const templateSelectionPrompt = `## Task
Classify the user's vinyl collection query into the most appropriate template type.

## Template Types
- **search**: Queries asking about existing albums/artists in collection (e.g., "do I have X", "albums by Y", "show my collection", "oldest album", "newest album", "albums from 2020", "what year did X come out", "what genre is X")
- **add**: Requests to add new albums to collection (e.g., "add X", "if I don't have X, add it")
- **remove**: Requests to remove albums from collection (e.g., "remove X", "delete X")
- **insights**: Requests for analysis/statistics about collection (e.g., "analyze my collection", "what genres do I have", "collection trends")
- **general**: General questions or unclear intent

## Examples
- "do i own any albums by Jane Remover" → search
- "what's my oldest album" → search
- "what's my newest album" → search
- "albums from the 70s" → search
- "what year did Reputation come out" → search
- "what genre is Dark Side of the Moon" → search
- "add Abbey Road by The Beatles" → add
- "remove Sgt Pepper" → remove
- "what genres do I have" → insights
- "analyze my collection trends" → insights
- "hello" → general

## Rules
- Artist names containing words like "remove" should NOT trigger remove template
- Focus on user intent, not just keyword matching
- When in doubt, prefer "search" over "general"
- Queries about specific album details (release year, when it came out, genre) are search queries
- Temporal queries (oldest, newest, albums from year) are search queries
- Web research queries (what genre, when did X come out, who is X) are handled within search template

## User Query
"${query}"

## Response
Return ONLY the template type: search, add, remove, insights, or general`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: templateSelectionPrompt }],
      temperature: 0.1,
      max_tokens: 10
    });

    const response = completion.choices[0]?.message?.content?.trim().toLowerCase();
    
    if (response && ['search', 'add', 'remove', 'insights', 'general'].includes(response)) {
      console.log(`[OPTIMIZATION] AI selected template: ${response} for query: "${query}"`);
      return response as 'search' | 'add' | 'remove' | 'insights' | 'general';
    }
    
    console.log(`[OPTIMIZATION] AI returned invalid template: "${response}", defaulting to search`);
    return 'search';
    
  } catch (error) {
    console.error('[OPTIMIZATION] AI template selection failed:', error);
    console.log('[OPTIMIZATION] Defaulting to search template');
    return 'search';
  }
}

// Optimized prompt templates
const PROMPT_TEMPLATES = {
  // Core planning prompt (reduced from ~800 to ~300 tokens)
  core: `## Role
Vinyl collection planning assistant.

## Task
Create operation plans using available tools, prioritizing collection data over web search.

## Output
Return ONLY valid JSON: {"operations": [{"tool": "name", "parameters": {}, "description": "desc", "requiresConfirmation": bool}]}

## Rules
- JSON only, no explanatory text
- Add/remove operations require confirmation
- Support conditional logic ("if I don't have X, add it")
- Distinguish artist vs album queries
- ALWAYS try collection first, use web search only as fallback

## Available Tools
{TOOLS}

## Query Patterns
- Artist queries: "albums by [artist]" → searchType: "artist"
- Album queries: "do I have [album]", "what year did [album] come out" → searchType: "album"
- Combined: "[album] by [artist]" → searchType: "combined"
- Temporal: "oldest", "newest", "2013" → searchType: "temporal"
- Genre/style: "rock albums" → searchType: "album"

## Examples
User: "Do I have Dark Side of the Moon?"
{"operations": [{"tool": "vinyl_collection_query", "parameters": {"query": "Dark Side of the Moon", "searchType": "combined"}, "description": "Search for Dark Side of the Moon", "requiresConfirmation": false}]}

User: "What's my oldest album?"
{"operations": [{"tool": "vinyl_collection_query", "parameters": {"query": "oldest album", "searchType": "temporal"}, "description": "Find the oldest album in the collection", "requiresConfirmation": false}]}

User: "What year did Kids come out?"
{"operations": [{"tool": "vinyl_collection_query", "parameters": {"query": "Kids", "searchType": "album"}, "description": "Search for Kids album to find release year", "requiresConfirmation": false}]}

User: "When did Abbey Road come out?"
{"operations": [{"tool": "vinyl_collection_query", "parameters": {"query": "Abbey Road", "searchType": "album"}, "description": "Search for Abbey Road album to find release year", "requiresConfirmation": false}]}

User: "Add Abbey Road by The Beatles"
{"operations": [{"tool": "vinyl_add_album", "parameters": {"albumName": "Abbey Road", "artistName": "The Beatles"}, "description": "Add Abbey Road by The Beatles", "requiresConfirmation": true}]}

User: "If I don't have Revolver, add it"
{"operations": [{"tool": "vinyl_collection_query", "parameters": {"query": "Revolver", "searchType": "combined"}, "description": "Check if Revolver exists", "requiresConfirmation": false}]}

{CONTEXT}

{PREVIOUS_RESULTS}

## Current Request
"{QUERY}"

{REFLECTION_ANALYSIS}`,

  // Search-focused prompt (for search queries)
  search: `## Role
Vinyl collection search assistant.

## Task
Plan search operations using semantic similarity, prioritizing collection data over web search.

## Output
Return ONLY valid JSON: {"operations": [{"tool": "name", "parameters": {}, "description": "desc", "requiresConfirmation": false}]}

## Search Strategy
- ALWAYS try collection first: "what year did [album] come out" → vinyl_collection_query
- Only use web search if collection search fails or returns no results
- Collection queries: "albums by [artist]", "do I have [album]" → vinyl_collection_query
- Combined: "[album] by [artist]" → vinyl_collection_query with searchType: "combined"
- Temporal: "oldest", "newest", "2013" → vinyl_collection_query with searchType: "temporal"

## Examples
User: "What do I have by The Beatles?"
{"operations": [{"tool": "vinyl_collection_query", "parameters": {"query": "The Beatles", "searchType": "artist"}, "description": "Search for Beatles albums", "requiresConfirmation": false}]}

User: "Find albums from the 70s"
{"operations": [{"tool": "vinyl_collection_query", "parameters": {"query": "albums from the 1970s", "searchType": "temporal"}, "description": "Search for 70s albums", "requiresConfirmation": false}]}

User: "What's my oldest album?"
{"operations": [{"tool": "vinyl_collection_query", "parameters": {"query": "oldest album", "searchType": "temporal"}, "description": "Find the oldest album in the collection", "requiresConfirmation": false}]}

User: "What year did Kids come out?"
{"operations": [{"tool": "vinyl_collection_query", "parameters": {"query": "Kids", "searchType": "album"}, "description": "Search collection for Kids album release year", "requiresConfirmation": false}]}

User: "When did Abbey Road come out?"
{"operations": [{"tool": "vinyl_collection_query", "parameters": {"query": "Abbey Road", "searchType": "album"}, "description": "Search collection for Abbey Road release year", "requiresConfirmation": false}]}

User: "What genre is Reputation?"
{"operations": [{"tool": "vinyl_collection_query", "parameters": {"query": "Reputation", "searchType": "album"}, "description": "Search collection for Reputation album", "requiresConfirmation": false}]}

{CONTEXT}

## Current Request
"{QUERY}"`,

  // Add-focused prompt (for add operations)
  add: `## Role
Vinyl collection add assistant.

## Task
Plan album addition operations.

## Output
Return ONLY valid JSON: {"operations": [{"tool": "vinyl_add_album", "parameters": {"albumName": "name", "artistName": "artist"}, "description": "desc", "requiresConfirmation": true}]}

## Rules
- Always requires confirmation
- Extract album and artist names
- Support conditional logic

## Examples
User: "Add Abbey Road by The Beatles"
{"operations": [{"tool": "vinyl_add_album", "parameters": {"albumName": "Abbey Road", "artistName": "The Beatles"}, "description": "Add Abbey Road by The Beatles", "requiresConfirmation": true}]}

User: "If I don't have Revolver, add it"
{"operations": [{"tool": "vinyl_collection_query", "parameters": {"query": "Revolver", "searchType": "combined"}, "description": "Check if Revolver exists", "requiresConfirmation": false}]}

{CONTEXT}

{PREVIOUS_RESULTS}

## Current Request
"{QUERY}"

{REFLECTION_ANALYSIS}`,

  // Remove-focused prompt (for remove operations)
  remove: `## Role
Vinyl collection remove assistant.

## Task
Plan album removal operations.

## Output
Return ONLY valid JSON: {"operations": [{"tool": "vinyl_remove_album", "parameters": {"albumName": "name", "artistName": "artist"}, "description": "desc", "requiresConfirmation": true}]}

## Rules
- Always requires confirmation
- Extract album and artist names

## Examples
User: "Remove Sgt Pepper"
{"operations": [{"tool": "vinyl_remove_album", "parameters": {"albumName": "Sgt Pepper", "artistName": "The Beatles"}, "description": "Remove Sgt Pepper", "requiresConfirmation": true}]}

{CONTEXT}

## Current Request
"{QUERY}"`,

  // Insights-focused prompt (for analysis queries)
  insights: `## Role
Vinyl collection insights assistant.

## Task
Plan collection analysis operations.

## Output
Return ONLY valid JSON: {"operations": [{"tool": "vinyl_collection_query", "parameters": {"query": "all albums", "searchType": "combined", "limit": 1000}, "description": "desc", "requiresConfirmation": false}]}

## Query Types
- Simple counts: "how many albums do i have" → query: "all albums", searchType: "combined"
- Collection overview: "what's in my collection" → query: "all albums", searchType: "combined"
- Complex analysis: Use vinyl_collection_insights with specific insightType

## Examples
User: "How many albums do I have?"
{"operations": [{"tool": "vinyl_collection_query", "parameters": {"query": "all albums", "searchType": "combined", "limit": 1000}, "description": "Get all albums for count", "requiresConfirmation": false}]}

User: "What's in my collection?"
{"operations": [{"tool": "vinyl_collection_query", "parameters": {"query": "all albums", "searchType": "combined", "limit": 100}, "description": "Get collection overview", "requiresConfirmation": false}]}

User: "What genres do I have?"
{"operations": [{"tool": "vinyl_collection_insights", "parameters": {"insightType": "genres", "limit": 5}, "description": "Analyze genres in collection", "requiresConfirmation": false}]}

{CONTEXT}

## Current Request
"{QUERY}"`
};

// Optimized response formatting prompt (reduced from ~400 to ~200 tokens)
const RESPONSE_TEMPLATE = `## Role
Friendly vinyl collection assistant.

## Task
Convert results to natural responses.

## Rules
- Use exact names from results
- Be conversational and helpful
- Use HTML <ul> for lists
- Match results accurately
- For release year queries, provide the specific year: "Kids by The Midnight came out in 2018"
- For album detail queries, focus on the specific information requested
- For web search results, provide the answer naturally and mention sources if available

## Response Patterns
- Found albums: "I found [X] albums: <ul><li>Album by Artist</li></ul>"
- Album details: "The album [album] by [artist] came out in [year]"
- Release year queries: "Kids by The Midnight came out in 2018"
- No results: "No albums found matching '[query]'"
- Add success: "Successfully added [album] by [artist]!"
- Remove success: "Successfully removed [album] by [artist]"
- Conditional: "I checked and you [already have/didn't have] [album] by [artist]"
- Insights: "Here are insights: <ul><li>Insight 1</li><li>Insight 2</li></ul>"
- Web search: "[Answer from web search]. Sources: <ul><li>Source 1</li><li>Source 2</li></ul>"
- Web search error: "I couldn't find information about [query] online."

## Input
User: "{QUERY}"
Results: {RESULTS}

{CONTEXT}

## Response
Provide a friendly, clear response that matches the results.`;

// Tool definitions - Enhanced RAG Tools v1.5
const TOOLS = {
  // Core collection management with semantic search
  vinyl_collection_query: {
    name: 'vinyl_collection_query',
    description: 'Search and query the vinyl collection using semantic similarity with embeddings',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language search query (required)' },
        searchType: { type: 'string', description: 'Type of search: album, artist, temporal, combined (default: combined)' },
        limit: { type: 'number', description: 'Maximum number of results (default: 1000)' },
        similarityThreshold: { type: 'number', description: 'Minimum similarity score (default: 0.7)' }
      },
      required: ['query']
    }
  },
  
  // Album management
  vinyl_add_album: {
    name: 'vinyl_add_album',
    description: 'Add a new album to the collection',
    inputSchema: {
      type: 'object',
      properties: {
        albumName: { type: 'string', description: 'Album name (required)' },
        artistName: { type: 'string', description: 'Artist name (required)' },
        releaseYear: { type: 'number', description: 'Release year (optional)' },
        purchasedDate: { type: 'string', description: 'Purchase date in YYYY-MM-DD format (optional)' },
        receivedDate: { type: 'string', description: 'Received date in YYYY-MM-DD format (optional)' }
      },
      required: ['albumName', 'artistName']
    }
  },
  
  vinyl_remove_album: {
    name: 'vinyl_remove_album',
    description: 'Remove an album from the collection',
    inputSchema: {
      type: 'object',
      properties: {
        albumName: { type: 'string', description: 'Album name to remove (required)' },
        artistName: { type: 'string', description: 'Artist name (required)' }
      },
      required: ['albumName', 'artistName']
    }
  },
  
  // Collection insights
  vinyl_collection_insights: {
    name: 'vinyl_collection_insights',
    description: 'Get AI-generated insights about the collection using embeddings',
    inputSchema: {
      type: 'object',
      properties: {
        insightType: { type: 'string', description: 'Type of insight: genres, eras, themes, recommendations, temporal (default: genres)' },
        limit: { type: 'number', description: 'Number of insights to generate (default: 5)' }
      }
    }
  },
  
  // Web search for questions that can't be answered from collection metadata
  vinyl_web_search: {
    name: 'vinyl_web_search',
    description: 'Search the web for information about albums, artists, genres, release dates, and music history',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Web search query (required)' },
        searchType: { type: 'string', description: 'Type of search: genre, release_info, artist_info, context, reception (default: auto-detected)' },
        albumName: { type: 'string', description: 'Album name for context (optional)' },
        artistName: { type: 'string', description: 'Artist name for context (optional)' },
        year: { type: 'number', description: 'Release year for context (optional)' }
      },
      required: ['query']
    }
  }
};

// Function to plan operations using GPT with optimized prompts
async function planOperations(message: string, conversationContext?: string, previousResults?: any[]): Promise<Operation[]> {
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return [];
    }

    // Validate inputs
    const validatedMessage = validateUserInput(message);
    let validatedContext = validateConversationContext(conversationContext || '');
    
    if (!validatedMessage) {
      console.log('[chat-response] Empty or invalid message received');
      return [];
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Context optimization: summarize long contexts and check relevance
    if (validatedContext.length > 1000) {
      const relevance = calculateContextRelevance(validatedContext, validatedMessage);
      console.log(`[OPTIMIZATION] Context relevance: ${relevance.toFixed(2)}, length: ${validatedContext.length}`);
      
      if (relevance < 0.3) {
        // Low relevance context - summarize or truncate
        console.log(`[OPTIMIZATION] Low relevance context (${relevance.toFixed(2)}), summarizing...`);
        validatedContext = await summarizeConversation(validatedContext, openai);
      } else if (validatedContext.length > 1500) {
        // High relevance but too long - summarize
        console.log(`[OPTIMIZATION] Long context (${validatedContext.length} chars), summarizing...`);
        validatedContext = await summarizeConversation(validatedContext, openai);
      }
    }

    // Select appropriate prompt template based on query type using AI
    const promptType = await selectPromptTemplate(validatedMessage, validatedContext);
    let template = PROMPT_TEMPLATES[promptType] || PROMPT_TEMPLATES.core;
    console.log(`[OPTIMIZATION] Selected prompt template: ${promptType}`);

    // Build dynamic sections
    const toolDescriptions = Object.values(TOOLS).map(tool => 
      `- "${tool.name}": ${tool.description}`
    ).join('\n');

    const contextSection = validatedContext ? `## Context
${validatedContext}` : '';

    const previousResultsSection = previousResults && previousResults.length > 0 ? `## Previous Results
${previousResults.map((result, index) => 
  `${index + 1}. ${result.operation.description} - ${result.success ? 'SUCCESS' : 'FAILED'}
   ${result.success ? JSON.stringify(result.result, null, 2) : `Error: ${result.error}`}`
).join('\n\n')}` : '';

    const reflectionAnalysis = previousResults && previousResults.length > 0 ? `
## Reflection
Analyze previous results and decide next steps:
- If the last operation was a vinyl_collection_query that returned found: true, the search was successful and the request is satisfied. Return {"operations": []}.
- If the last operation was a vinyl_collection_query that returned found: false, consider web search as fallback for questions about album details, genres, release dates, etc.
- "if I don't have X, add it": If found: false → plan add; if found: true → return empty
- "do I have X": If found: true → return empty (query answered); if found: false → return empty (confirmed not found)
- Direct "add X": Return empty (handled in first iteration)
- Web search fallback: If collection search found: false and query asks about album details (year, genre, etc.), try vinyl_web_search

IMPORTANT: If the last result shows found: true with albums, the search is complete. Return {"operations": []}.

Return {"operations": []} if satisfied, or plan next operation.` : '';

    // Replace template placeholders
    template = template
      .replace('{TOOLS}', toolDescriptions)
      .replace('{CONTEXT}', contextSection)
      .replace('{PREVIOUS_RESULTS}', previousResultsSection)
      .replace('{QUERY}', validatedMessage)
      .replace('{REFLECTION_ANALYSIS}', reflectionAnalysis);

    const messages = [
      { role: 'system', content: template }
    ];

    // Add conversation context as user messages (if not already summarized)
    if (validatedContext && !validatedContext.includes('## Context')) {
      const contextLines = validatedContext.split('\n').filter(line => line.trim());
      for (const line of contextLines) {
        if (line.startsWith('User: ')) {
          messages.push({ role: 'user', content: line.substring(6) });
        } else if (line.startsWith('Assistant: ')) {
          messages.push({ role: 'assistant', content: line.substring(11) });
        }
      }
    }

    messages.push({ role: 'user', content: validatedMessage });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.1,
      max_tokens: 600 // Reduced from 800 due to shorter prompts
    });

    console.log(`[OPTIMIZATION] Planning prompt tokens: ~${Math.ceil(template.length / 4)}`);

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      return [];
    }

    console.log(`[chat-response] Planning response:`, content);
    
    try {
      const parsed = JSON.parse(content);
      
      if (parsed.operations && Array.isArray(parsed.operations)) {
        console.log(`[chat-response] Planned ${parsed.operations.length} operations:`, parsed.operations.map(op => op.description));
        
        // Log if this is a repeat of a previous operation
        if (previousResults && previousResults.length > 0) {
          const lastResult = previousResults[previousResults.length - 1];
          if (parsed.operations.length === 1 && 
              parsed.operations[0].tool === lastResult.operation.tool &&
              JSON.stringify(parsed.operations[0].parameters) === JSON.stringify(lastResult.operation.parameters)) {
            console.log(`[AGENT] Detected duplicate operation planning`);
          }
        }
        
        return parsed.operations;
      }

      console.log(`[chat-response] No operations planned or invalid response format`);
      return [];
    } catch (parseError) {
      console.error('Error parsing planning response as JSON:', parseError);
      console.error('Raw response content:', content);
      console.error('Response length:', content.length);
      console.error('First 200 characters:', content.substring(0, 200));
      return [];
    }
  } catch (error) {
    console.error('Error planning operations:', error);
    return [];
  }
}

// Direct tool execution functions
async function executeVinylCollectionQuery(params: any, supabase: any, authHeader: string): Promise<any> {
  const { query, searchType = 'combined', limit = 1000, similarityThreshold = 0.7 } = params;
  
  console.log('[chat-response] Executing vinyl_collection_query with params:', params);
  
  if (!query) {
    throw new Error('Query parameter is required');
  }

  // Check for "all albums" queries that need direct database access
  if (query.toLowerCase().includes('all albums') || query.toLowerCase().includes('how many') || query.toLowerCase().includes('what\'s in my collection')) {
    console.log('[chat-response] Detected collection overview query, using direct database query');
    return await handleCollectionOverviewQuery(query, supabase, limit);
  }

  // Check for temporal queries that need special handling
  const temporalKeywords = ['oldest', 'newest', 'earliest', 'latest', 'first', 'last', 'recent', 'vintage', 'classic'];
  const isTemporalQuery = temporalKeywords.some(keyword => 
    query.toLowerCase().includes(keyword)
  );

  if (isTemporalQuery || searchType === 'temporal') {
    console.log('[chat-response] Detected temporal query, using direct database query');
    return await handleTemporalQuery(query, supabase, limit);
  }

  try {
    // Call the semantic-search function with user authentication
    const semanticSearchUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/semantic-search`;
    const response = await fetch(semanticSearchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        query,
        searchType,
        limit,
        similarityThreshold
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Semantic search error:', errorText);
      throw new Error(`Semantic search failed: ${response.status}`);
    }

    const searchResult = await response.json();
    
    if (!searchResult.success) {
      throw new Error(searchResult.error || 'Semantic search failed');
    }

    const results = searchResult.results || [];

    if (results.length === 0) {
      // Try fallback search types if initial search fails
      console.log(`[chat-response] No results with searchType: ${searchType}, trying fallback searches`);
      
      const fallbackSearchTypes = searchType === 'artist' ? ['combined', 'album'] : 
                                 searchType === 'album' ? ['combined', 'artist'] : 
                                 searchType === 'combined' ? ['artist', 'album'] : ['combined'];
      
      for (const fallbackType of fallbackSearchTypes) {
        try {
          console.log(`[chat-response] Trying fallback search with searchType: ${fallbackType}`);
          
          const fallbackResponse = await fetch(semanticSearchUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader,
            },
            body: JSON.stringify({
              query,
              searchType: fallbackType,
              limit,
              similarityThreshold: 0.5 // Lower threshold for fallback
            })
          });

          if (fallbackResponse.ok) {
            const fallbackResult = await fallbackResponse.json();
            if (fallbackResult.success && fallbackResult.results && fallbackResult.results.length > 0) {
              console.log(`[chat-response] Found ${fallbackResult.results.length} results with fallback searchType: ${fallbackType}`);
              
              const formattedResults = fallbackResult.results.map((result: any) => ({
                id: result.album_id,
                title: result.title,
                artist_name: result.artist_name,
                release_year: result.release_year,
                purchase_date: result.purchase_date,
                acquired_date: result.received_date || result.acquired_date,
                similarity: result.similarity
              }));

              const message = fallbackResult.results.length === 1 
                ? `Found 1 album: "${fallbackResult.results[0].title}" by ${fallbackResult.results[0].artist_name} (similarity: ${(fallbackResult.results[0].similarity * 100).toFixed(1)}%)`
                : `Found ${fallbackResult.results.length} albums matching "${query}": ${fallbackResult.results.map((a: any) => `"${a.title}" by ${a.artist_name}`).join(', ')}`;

              return {
                found: true,
                message,
                albums: formattedResults,
                query,
                searchType: fallbackType,
                similarityThreshold: 0.5,
                totalResults: fallbackResult.results.length,
                fallbackUsed: true
              };
            }
          }
        } catch (fallbackError) {
          console.error(`[chat-response] Fallback search with ${fallbackType} failed:`, fallbackError);
        }
      }
      
      return {
        found: false,
        message: `No albums found matching "${query}"`,
        query,
        searchType,
        albums: []
      };
    }

    // Format results to match expected structure
    const formattedResults = results.map((result: any) => ({
      id: result.album_id,
      title: result.title,
      artist_name: result.artist_name,
      release_year: result.release_year,
      purchase_date: result.purchase_date,
      acquired_date: result.received_date || result.acquired_date,
      similarity: result.similarity
    }));

    const message = results.length === 1 
      ? `Found 1 album: "${results[0].title}" by ${results[0].artist_name} (similarity: ${(results[0].similarity * 100).toFixed(1)}%)`
      : `Found ${results.length} albums matching "${query}": ${results.map((a: any) => `"${a.title}" by ${a.artist_name}`).join(', ')}`;

    return {
      found: true,
      message,
      albums: formattedResults,
      query,
      searchType,
      similarityThreshold,
      totalResults: results.length
    };

  } catch (error) {
    console.error('Error in executeVinylCollectionQuery:', error);
    
    // Fallback to traditional search if semantic search fails
    console.log('[chat-response] Falling back to traditional search');
    
    // Extract potential album/artist names from query for fallback
    const words = query.split(' ').filter(word => word.length > 2);
    const potentialAlbumName = words.slice(0, 2).join(' ');
    const potentialArtistName = words.slice(-2).join(' ');
    
    let fallbackQuery = supabase.from('album').select(`
      id,
      title,
      artist_id,
      release_year,
      purchase_date,
      acquired_date
    `);

    // Try to find matches
    fallbackQuery = fallbackQuery.or(`title.ilike.%${potentialAlbumName}%,title.ilike.%${potentialArtistName}%`);
    
    const { data: albums, error: albumError } = await fallbackQuery.limit(limit);

    if (albumError) {
      throw albumError;
    }

    if (!albums || albums.length === 0) {
      return {
        found: false,
        message: `No albums found matching "${query}" (semantic search unavailable)`,
        query,
        searchType,
        albums: [],
        fallbackUsed: true
      };
    }

    // Get artist names
    const results = await Promise.all(albums.map(async (album) => {
      const { data: artist, error: artistError } = await supabase
        .from('artist')
        .select('name')
        .eq('id', album.artist_id)
        .single();

      if (artistError) {
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

    return {
      found: true,
      message: `Found ${results.length} albums (fallback search): ${results.map(a => `"${a.title}" by ${a.artist_name}`).join(', ')}`,
      albums: results,
      query,
      searchType,
      fallbackUsed: true,
      totalResults: results.length
    };
  }
}

// Helper function to handle temporal queries directly
async function handleTemporalQuery(query: string, supabase: any, limit: number): Promise<any> {
  const queryLower = query.toLowerCase();
  
  // Get all albums with release years
  const { data: albums, error: albumError } = await supabase
    .from('album')
    .select(`
      id,
      title,
      artist_id,
      release_year,
      purchase_date,
      acquired_date
    `)
    .not('release_year', 'is', null)
    .order('release_year', { ascending: true });

  if (albumError) {
    throw albumError;
  }

  if (!albums || albums.length === 0) {
    return {
      found: false,
      message: 'No albums with release year information found in your collection',
      query,
      searchType: 'temporal',
      albums: []
    };
  }

  // Get artist names
  const results = await Promise.all(albums.map(async (album) => {
    const { data: artist, error: artistError } = await supabase
      .from('artist')
      .select('name')
      .eq('id', album.artist_id)
      .single();

    if (artistError) {
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

  let filteredResults = results;
  let message = '';

  // Extract year from query if present
  const yearMatch = query.match(/\b(19|20)\d{2}\b/);
  const specificYear = yearMatch ? parseInt(yearMatch[0]) : null;

  // Apply temporal filtering based on query
  if (specificYear) {
    // Specific year query
    filteredResults = results.filter(a => a.release_year === specificYear);
    message = `Your album${filteredResults.length !== 1 ? 's' : ''} from ${specificYear}:`;
  } else if (queryLower.includes('oldest') || queryLower.includes('earliest')) {
    const oldestYear = Math.min(...results.map(a => a.release_year));
    filteredResults = results.filter(a => a.release_year === oldestYear);
    message = `Your oldest album${filteredResults.length > 1 ? 's' : ''} from ${oldestYear}:`;
  } else if (queryLower.includes('newest') || queryLower.includes('latest')) {
    const newestYear = Math.max(...results.map(a => a.release_year));
    filteredResults = results.filter(a => a.release_year === newestYear);
    message = `Your newest album${filteredResults.length > 1 ? 's' : ''} from ${newestYear}:`;
  } else if (queryLower.includes('recent')) {
    const currentYear = new Date().getFullYear();
    const recentThreshold = currentYear - 10;
    filteredResults = results.filter(a => a.release_year >= recentThreshold);
    message = `Your recent albums (${recentThreshold}-${currentYear}):`;
  } else if (queryLower.includes('vintage') || queryLower.includes('classic')) {
    const vintageThreshold = 1980;
    filteredResults = results.filter(a => a.release_year <= vintageThreshold);
    message = `Your vintage/classic albums (pre-${vintageThreshold + 1}):`;
  } else if (queryLower.includes('70s') || queryLower.includes('1970s')) {
    filteredResults = results.filter(a => a.release_year >= 1970 && a.release_year <= 1979);
    message = `Your albums from the 1970s:`;
  } else if (queryLower.includes('80s') || queryLower.includes('1980s')) {
    filteredResults = results.filter(a => a.release_year >= 1980 && a.release_year <= 1989);
    message = `Your albums from the 1980s:`;
  } else if (queryLower.includes('90s') || queryLower.includes('1990s')) {
    filteredResults = results.filter(a => a.release_year >= 1990 && a.release_year <= 1999);
    message = `Your albums from the 1990s:`;
  } else if (queryLower.includes('2000s') || queryLower.includes('00s')) {
    filteredResults = results.filter(a => a.release_year >= 2000 && a.release_year <= 2009);
    message = `Your albums from the 2000s:`;
  } else if (queryLower.includes('2010s') || queryLower.includes('10s')) {
    filteredResults = results.filter(a => a.release_year >= 2010 && a.release_year <= 2019);
    message = `Your albums from the 2010s:`;
  } else if (queryLower.includes('2020s') || queryLower.includes('20s')) {
    filteredResults = results.filter(a => a.release_year >= 2020);
    message = `Your albums from the 2020s:`;
  } else {
    // Default: return all albums sorted by release year
    filteredResults = results.slice(0, limit);
    message = `Your albums sorted by release year:`;
  }

  if (filteredResults.length === 0) {
    return {
      found: false,
      message: `No albums match your temporal query: "${query}"`,
      query,
      searchType: 'temporal',
      albums: []
    };
  }

  // Limit results
  filteredResults = filteredResults.slice(0, limit);

  return {
    found: true,
    message: `${message} ${filteredResults.map(a => `"${a.title}" by ${a.artist_name} (${a.release_year})`).join(', ')}`,
    albums: filteredResults,
    query,
    searchType: 'temporal',
    totalResults: filteredResults.length,
    temporalQuery: true
  };
}

// Helper function to handle collection overview queries directly
async function handleCollectionOverviewQuery(query: string, supabase: any, limit: number): Promise<any> {
  const queryLower = query.toLowerCase();
  
  // Get total count of albums
  const { count: totalAlbums, error: countError } = await supabase
    .from('album')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    throw countError;
  }

  // Get total count of artists
  const { count: totalArtists, error: artistCountError } = await supabase
    .from('artist')
    .select('*', { count: 'exact', head: true });

  if (artistCountError) {
    throw artistCountError;
  }

  // If it's just a count query, return the count
  if (queryLower.includes('how many')) {
    return {
      found: true,
      message: `You have ${totalAlbums || 0} albums by ${totalArtists || 0} different artists in your collection.`,
      query,
      searchType: 'overview',
      totalResults: totalAlbums || 0,
      totalArtists: totalArtists || 0,
      isCountQuery: true
    };
  }

  // For overview queries, get some sample albums
  const { data: albums, error: albumError } = await supabase
    .from('album')
    .select(`
      id,
      title,
      artist_id,
      release_year,
      purchase_date,
      acquired_date
    `)
    .order('acquired_date', { ascending: false })
    .limit(limit);

  if (albumError) {
    throw albumError;
  }

  if (!albums || albums.length === 0) {
    return {
      found: false,
      message: 'Your collection is empty. Start adding albums to get started!',
      query,
      searchType: 'overview',
      albums: [],
      totalResults: 0,
      totalArtists: 0
    };
  }

  // Get artist names
  const results = await Promise.all(albums.map(async (album) => {
    const { data: artist, error: artistError } = await supabase
      .from('artist')
      .select('name')
      .eq('id', album.artist_id)
      .single();

    if (artistError) {
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

  const message = `Your collection contains ${totalAlbums} albums by ${totalArtists} artists. Here are your ${results.length} most recent additions:`;

  return {
    found: true,
    message: `${message} ${results.map(a => `"${a.title}" by ${a.artist_name}`).join(', ')}`,
    albums: results,
    query,
    searchType: 'overview',
    totalResults: totalAlbums || 0,
    totalArtists: totalArtists || 0,
    overviewQuery: true
  };
}

async function executeVinylAddAlbum(params: any, supabase: any): Promise<any> {
  console.log('[chat-response] Executing vinyl_add_album with params:', params);
  
  const { albumName, artistName, releaseYear, purchasedDate, receivedDate } = params;
  
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
    purchase_date: purchasedDate || null,
    acquired_date: receivedDate || new Date().toISOString().split('T')[0]
  };

  const { data: newAlbum, error: albumCreateError } = await supabase
    .from('album')
    .insert([albumData])
    .select(`
      id,
      title,
      artist_id,
      release_year,
      purchase_date,
      acquired_date
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
  
  const { albumName, artistName } = params;

  if (!albumName || !artistName) {
    throw new Error('Both albumName and artistName are required');
  }

  // Find the album by name and artist
  const { data: artists, error: artistError } = await supabase
    .from('artist')
    .select('id')
    .ilike('name', artistName);
  
  if (artistError || !artists?.length) {
    throw new Error(`No artist found matching "${artistName}"`);
  }
  
  const artistId = artists[0].id;
  
  const { data: albums, error: albumError } = await supabase
    .from('album')
    .select('id, title, artist_id')
    .ilike('title', albumName)
    .eq('artist_id', artistId);
  
  if (albumError || !albums?.length) {
    throw new Error(`No album found with title "${albumName}" by "${artistName}"`);
  }
  
  if (albums.length > 1) {
    const albumOptions = albums.map(a => `"${a.title}"`).join(', ');
    throw new Error(`Multiple albums found with title "${albumName}" by "${artistName}". Please be more specific. Options: ${albumOptions}`);
  }
  
  const album = albums[0];

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

async function executeVinylCollectionInsights(params: any, supabase: any, authHeader: string): Promise<any> {
  console.log('[chat-response] Executing vinyl_collection_insights with params:', params);
  
  const { insightType = 'genres', limit = 5 } = params;

  try {
    // Call the collection-insights function
    const insightsUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/collection-insights`;
    const response = await fetch(insightsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        insightType,
        limit
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Collection insights error:', errorText);
      throw new Error(`Collection insights failed: ${response.status}`);
    }

    const insightsResult = await response.json();
    
    if (!insightsResult.success) {
      throw new Error(insightsResult.error || 'Collection insights failed');
    }

    const insights = insightsResult.insights || [];

    if (insights.length === 0) {
      return {
        success: false,
        message: `No insights generated for ${insightType}`,
        insightType,
        insights: []
      };
    }

    return {
      success: true,
      message: `Generated ${insights.length} insights about your collection`,
      insightType,
      insights,
      limit,
      generatedAt: insightsResult.generatedAt
    };

  } catch (error) {
    console.error('Error in executeVinylCollectionInsights:', error);
    
    // Fallback to basic collection analysis
    console.log('[chat-response] Falling back to basic collection analysis');
    
    try {
      // Get basic collection data for fallback analysis
      const { data: albums, error: albumsError } = await supabase
        .from('album')
        .select(`
          title,
          release_year,
          purchase_date,
          acquired_date,
          artist:artist_id(name)
        `)
        .order('acquired_date', { ascending: false })
        .limit(50);

      if (albumsError) {
        throw albumsError;
      }

      if (!albums || albums.length === 0) {
        return {
          success: false,
          message: 'Your collection is empty. Start adding albums to get insights!',
          insightType,
          insights: []
        };
      }

      // Generate basic fallback insights
      const fallbackInsights = [];
      
      // Basic stats insight
      const totalAlbums = albums.length;
      const artists = [...new Set(albums.map(a => a.artist.name))];
      const totalArtists = artists.length;
      
      fallbackInsights.push({
        type: 'basic_stats',
        title: 'Collection Overview',
        description: `You have ${totalAlbums} albums by ${totalArtists} different artists in your collection.`,
        confidence: 1.0
      });

      // Recent acquisitions insight
      const recentAlbums = albums.filter(a => a.acquired_date && 
        new Date(a.acquired_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      
      if (recentAlbums.length > 0) {
        fallbackInsights.push({
          type: 'recent_acquisitions',
          title: 'Recent Additions',
          description: `You've added ${recentAlbums.length} albums in the last 30 days, including "${recentAlbums[0].title}" by ${recentAlbums[0].artist.name}.`,
          confidence: 0.9
        });
      }

      // Release year range insight
      const releaseYears = albums.filter(a => a.release_year).map(a => a.release_year);
      if (releaseYears.length > 0) {
        const minYear = Math.min(...releaseYears);
        const maxYear = Math.max(...releaseYears);
        fallbackInsights.push({
          type: 'era_span',
          title: 'Era Coverage',
          description: `Your collection spans from ${minYear} to ${maxYear}, covering ${maxYear - minYear + 1} years of music history.`,
          confidence: 0.8
        });
      }

      return {
        success: true,
        message: `Generated ${fallbackInsights.length} basic insights about your collection`,
        insightType,
        insights: fallbackInsights.slice(0, limit),
        limit,
        fallbackUsed: true
      };

    } catch (fallbackError) {
      console.error('Fallback analysis also failed:', fallbackError);
      throw new Error('Unable to generate collection insights');
    }
  }
}

async function executeVinylWebSearch(params: any, supabase: any, authHeader: string): Promise<any> {
  console.log('[chat-response] Executing vinyl_web_search with params:', params);
  
  const { query, searchType, albumName, artistName, year } = params;
  
  if (!query) {
    throw new Error('Query parameter is required');
  }

  try {
    // Call the web-search function
    const webSearchUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/web-search`;
    const response = await fetch(webSearchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        query,
        searchType,
        albumName,
        artistName,
        year
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Web search error:', errorText);
      throw new Error(`Web search failed: ${response.status}`);
    }

    const searchResult = await response.json();
    
    if (!searchResult.success) {
      throw new Error(searchResult.error || searchResult.message || 'Web search failed');
    }

    return {
      success: true,
      message: searchResult.answer,
      query: searchResult.query,
      answer: searchResult.answer,
      sources: searchResult.sources || [],
      confidence: searchResult.confidence || 0.7,
      searchType: searchResult.searchType,
      webSearch: true
    };

  } catch (error) {
    console.error('Error in executeVinylWebSearch:', error);
    
    // Fallback response for web search failures
    return {
      success: false,
      message: `I couldn't find information about "${query}" online. This might be because the information isn't widely available or there was a temporary issue with the search service.`,
      query,
      searchType,
      error: error.message,
      webSearch: true
    };
  }
}






// Function to execute operations with reflection and planning
async function executeOperationsWithReflection(
  userMessage: string, 
  conversationContext: string, 
  supabase: any,
  authHeader: string
): Promise<{results: ExecutionResult[], requiresConfirmation: boolean, confirmationOperations: Operation[]}> {
  const results: ExecutionResult[] = [];
  let iteration = 0;
  const maxIterations = 5; // Prevent infinite loops
  
  while (iteration < maxIterations) {
    console.log(`[chat-response] Planning iteration ${iteration + 1}`);
    
    // Plan next operations based on current results
    const operations = await planOperations(userMessage, conversationContext, results);
    
    if (operations.length === 0) {
      // If the last result was successful, log and break to prevent repeats
      if (results.length > 0 && results[results.length - 1].success) {
        console.log('[OPTIMIZATION] Request satisfied, stopping further planning iterations.');
        break;
      }
      console.log(`[chat-response] No more operations planned after iteration ${iteration + 1} - user request satisfied`);
      break;
    }
    
    // Check if we're about to repeat the exact same operation
    if (results.length > 0 && operations.length === 1) {
      const lastResult = results[results.length - 1];
      const nextOperation = operations[0];
      
      if (lastResult.operation.tool === nextOperation.tool &&
          JSON.stringify(lastResult.operation.parameters) === JSON.stringify(nextOperation.parameters)) {
        console.log(`[AGENT] Preventing duplicate operation execution`);
        break;
      }
    }
    
    console.log(`[chat-response] Planned ${operations.length} operation(s) for iteration ${iteration + 1}:`, 
      operations.map(op => op.description));
    
    // Check if any operations require confirmation
    const operationsRequiringConfirmation = operations.filter(op => op.requiresConfirmation);
    const operationsToExecute = operations.filter(op => !op.requiresConfirmation);
    
    if (operationsRequiringConfirmation.length > 0) {
      console.log(`[chat-response] Found ${operationsRequiringConfirmation.length} operations requiring confirmation`);
      // Return the results so far and the confirmation requests
      return {
        results,
        requiresConfirmation: true,
        confirmationOperations: operationsRequiringConfirmation
      };
    }
    
    // Execute operations that don't require confirmation
    if (operationsToExecute.length > 0) {
      let shouldBreakOuterLoop = false;
      
      for (let i = 0; i < operationsToExecute.length; i++) {
        const operation = operationsToExecute[i];
        
        console.log(`[chat-response] Executing operation ${i + 1}/${operationsToExecute.length}: ${operation.description}`);
        const result = await executeOperation(operation, supabase, authHeader);
        
        const executionResult = {
          operation,
          success: result.success,
          result: result.result,
          error: result.error
        };
        
        results.push(executionResult);
        
        // Check if this was a successful search operation that found results
        if (result.success && operation.tool === 'vinyl_collection_query' && result.result.found === true) {
          console.log(`[AGENT] Search successful: found ${result.result.totalResults || 0} albums for "${result.result.query}"`);
          
          // If this was a successful search that found results, break out of the outer loop
          // to prevent infinite repetition of the same search
          shouldBreakOuterLoop = true;
          break;
        }
        
        // Handle alternative searches
        if (result.shouldRetryWithAlternative && result.alternativeSearch) {
          console.log(`[chat-response] Trying alternative search: ${result.alternativeSearch.description}`);
          const alternativeResult = await executeOperation(result.alternativeSearch, supabase, authHeader);
          results.push({
            operation: result.alternativeSearch,
            success: alternativeResult.success,
            result: alternativeResult.result,
            error: alternativeResult.error
          });
        }
      }
      
      // Break out of the outer loop if a successful search was found
      if (shouldBreakOuterLoop) {
        console.log(`[AGENT] Request satisfied, stopping further planning`);
        break;
      }
    }
    
    iteration++;
  }
  
  if (iteration >= maxIterations) {
    console.log(`[chat-response] Reached maximum iterations (${maxIterations}), stopping execution`);
  }
  
  return {
    results,
    requiresConfirmation: false,
    confirmationOperations: []
  };
}



// Function to execute operations directly
async function executeOperation(operation: Operation, supabase: any, authHeader: string): Promise<{success: boolean, result: any, error?: string, shouldRetryWithAlternative?: boolean}> {
  console.log(`[chat-response] Executing operation: ${operation.tool} with params:`, operation.parameters);
  
  try {
    let result;
    
    switch (operation.tool) {
      case 'vinyl_collection_query':
        result = await executeVinylCollectionQuery(operation.parameters, supabase, authHeader);
        break;
      case 'vinyl_add_album':
        result = await executeVinylAddAlbum(operation.parameters, supabase);
        break;
      case 'vinyl_remove_album':
        result = await executeVinylRemoveAlbum(operation.parameters, supabase);
        break;
      case 'vinyl_collection_insights':
        result = await executeVinylCollectionInsights(operation.parameters, supabase, authHeader);
        break;
      case 'vinyl_web_search':
        result = await executeVinylWebSearch(operation.parameters, supabase, authHeader);
        break;
      default:
        throw new Error(`Unknown tool: ${operation.tool}`);
    }
    
    console.log(`[chat-response] Tool ${operation.tool} returned result:`, result);
    
    // Check if this is a collection query that returned no results
    if (operation.tool === 'vinyl_collection_query' && result.found === false) {
      // For semantic search, we don't need alternative searches as the semantic search
      // should handle variations and similar terms automatically
      console.log(`[chat-response] Semantic search returned no results for query: ${operation.parameters.query}`);
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

// Function to format response using GPT with optimized prompt
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

    // Validate inputs
    const validatedQuestion = validateUserInput(originalQuestion);
    let validatedContext = validateConversationContext(conversationContext || '');

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Context optimization for response formatting
    if (validatedContext.length > 800) {
      const relevance = calculateContextRelevance(validatedContext, validatedQuestion);
      console.log(`[OPTIMIZATION] Response context relevance: ${relevance.toFixed(2)}, length: ${validatedContext.length}`);
      
      if (relevance < 0.2) {
        // Very low relevance - truncate
        console.log(`[OPTIMIZATION] Very low relevance context (${relevance.toFixed(2)}), truncating...`);
        validatedContext = validatedContext.substring(0, 800);
      } else if (validatedContext.length > 1200) {
        // High relevance but too long - summarize
        console.log(`[OPTIMIZATION] Long response context (${validatedContext.length} chars), summarizing...`);
        validatedContext = await summarizeConversation(validatedContext, openai);
      }
    }

    const taskInfo = executionResults.map((result, index) => {
      const status = result.success ? 'SUCCESS' : 'FAILED';
      const details = result.success 
        ? JSON.stringify(result.result, null, 2)
        : `Error: ${result.error}`;
      
      return `${index + 1}. ${result.operation.description} - ${status}\n${details}`;
    }).join('\n\n');

    // Use optimized response template
    let template = RESPONSE_TEMPLATE
      .replace('{QUERY}', validatedQuestion)
      .replace('{RESULTS}', taskInfo);

    const messages = [
      { role: 'system', content: template },
      { role: 'user', content: validatedQuestion }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.2,
      max_tokens: 300 // Reduced from 400 due to shorter prompt
    });

    console.log(`[OPTIMIZATION] Response prompt tokens: ~${Math.ceil(template.length / 4)}`);

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
      
      const result = await executeOperation(confirmedOperation, supabase, req.headers.get('Authorization') || '');
      
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

    // Execute operations with reflection and planning
    const executionResult = await executeOperationsWithReflection(userMessage, conversationContext, supabase, req.headers.get('Authorization') || '');
    
    // Handle case where no operations were planned
    if (executionResult.results.length === 0 && !executionResult.requiresConfirmation) {
      const response = {
        message: "Hi! I can help you check your vinyl collection. Try asking me something like 'Do I have Dark Side of the Moon by Pink Floyd?' or 'If I don't have Dark Side of the Moon, add it to my collection.'",
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
    
    if (executionResult.requiresConfirmation) {
      // Return confirmation requests
      const confirmationRequests = executionResult.confirmationOperations.map((op, index) => {
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
        message: `I found ${executionResult.confirmationOperations.length} album(s) that need your confirmation before ${executionResult.confirmationOperations[0].tool === 'vinyl_add_album' ? 'adding' : 'removing'} from your collection. Please review the details below.`,
        timestamp: new Date().toISOString(),
        type: 'album_confirmation',
        data: {
          confirmations: confirmationRequests,
          pendingOperations: executionResult.confirmationOperations
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
    
    // Format response using GPT
    const formattedMessage = await formatResponseWithGPT(userMessage, executionResult.results, conversationContext);
    
    const responseType = executionResult.results.length === 1 ? 'single_step' : 'multi_step';
    
    return new Response(JSON.stringify({
      message: formattedMessage,
      timestamp: new Date().toISOString(),
      type: responseType,
      data: {
        operations: executionResult.results.length,
        results: executionResult.results
      }
    }), {
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