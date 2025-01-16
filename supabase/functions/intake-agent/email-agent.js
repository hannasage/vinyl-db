import { createClient } from '@supabase/supabase-js';
import { Anthropic } from '@anthropic-ai/sdk';
import { StateGraph } from 'langchain/graphs';
import { Client } from "langsmith";

// Initialize LangSmith client
const langsmithClient = new Client({
  apiKey: process.env.LANGCHAIN_API_KEY,
  projectName: "vinyl-db-email-processor"
});

// Initialize clients
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Email processing workflow graph with tracing
const emailProcessingGraph = new StateGraph({
  channels: ['email_content', 'extracted_data', 'validation_result'],
  client: langsmithClient
});

// Email parsing node with tracing
emailProcessingGraph.addNode('parseEmail', async (email) => {
  return await langsmithClient.createTracer({
    name: "parse_email",
    tags: ["email-parsing"],
    metadata: {
      emailId: email.id,
      threadId: email.threadId
    }
  }).wrap(async () => {
    const startTime = Date.now();
    const message = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      temperature: 0,
      messages: [{
        role: 'user',
        content: `Analyze this email metadata to determine if it's a vinyl record purchase receipt or delivery confirmation.
        Only look at these fields:
        From Name: ${email.from.name}
        From Email: ${email.from.email} 
        Subject: ${email.subject}

        Return a JSON object with:
        {
          "isVinylEmail": boolean,
          "emailType": "receipt" | "delivery" | null,
          "confidence": number between 0-1,
          "reason": brief explanation,
          "email": {
            "from": {
              "name": string,
              "email": string
            },
            "subject": string,
            "body": string
          }
        }`
      }]
    });

    await langsmithClient.logMetrics({
      metrics: {
        extraction_time_ms: Date.now() - startTime,
        tokens_used: message.usage?.total_tokens || 0,
        completion_tokens: message.usage?.completion_tokens || 0
      },
      name: "email_parsing_metrics"
    });

    const itemSchema = z.object({
      isVinylEmail: z.boolean(),
      emailType: z.enum(['receipt', 'delivery', null]),
      confidence: z.number().min(0).max(1),
      reason: z.string(),
      email: z.object({
        from: z.object({
          name: z.string(),
          email: z.string()
        }),
        subject: z.string(),
        body: z.string()
      })
    });

    const result = JSON.parse(message.content);
    const validationResult = itemSchema.safeParse(result);

    if (!validationResult.success) {
      console.error('Invalid item data:', validationResult.error);
      throw new Error('Failed to validate parsed item data');
    }

    if (!result.isVinylReceipt) {
      return null;
    }
    return result;
  });
});

// Data extraction node with tracing
emailProcessingGraph.addNode('extractData', async (parsed) => {
  return await langsmithClient.createTracer({
    name: "extract_data",
    tags: ["data-extraction", "email-parsing"],
    metadata: {
      emailType: parsed.emailType,
      confidence: parsed.confidence
    }
  }).wrap(async () => {
    const startTime = Date.now();
    const getRes = async () => anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      temperature: 0,
      messages: [{
        role: 'user',
        content: `
          Analyze this email body and detect the vendor/source format.
          Then extract information about the purchased vinyl record in JSON format:
          - Artist
          - Album Title 
          - Release Year
          - Purchase Date
          - Format: 12 | 10 | 7
          - Variant (e.g. Black, White/Red Splatter, etc.)
          
          Email body to analyze: ${parsed.email.body}
          
          Return a JSON object with this exact shape:
          {
            "artist": "string",
            "albumTitle": "string", 
            "releaseYear": "string or number",
            "purchaseDate": "string",
            "format": "string",
            "variant": "string (optional)"
          }
        `
      }]
    });

    const itemSchema = z.object({
      artist: z.string(),
      albumTitle: z.string(),
      releaseYear: z.number().or(z.string()),
      purchaseDate: z.string(),
      format: z.string(),
      variant: z.string().optional()
    });

    const message = await getRes();
    const parsedItem = JSON.parse(message.content);
    const validationResult = itemSchema.safeParse(parsedItem);

    if (!validationResult.success) {
      console.error('Invalid item data:', validationResult.error);
      throw new Error('Failed to validate parsed item data');
    }
    
    await langsmithClient.logMetrics({
      metrics: {
        extraction_time_ms: Date.now() - startTime,
        tokens_used: message.usage?.total_tokens || 0,
        completion_tokens: message.usage?.completion_tokens || 0
      },
      name: "data_extraction_metrics"
    });

    return {
      isVinylEmail: parsed.isVinylEmail,
      emailType: parsed.emailType,
      confidence: parsed.confidence,
      reason: parsed.reason,
      email: parsed.email,
      parsedItem
    };
  });
});

// Artist resolution node with tracing
emailProcessingGraph.addNode('resolveArtist', async (data) => {
  return await langsmithClient.createTracer({
    name: "resolve_artist",
    tags: ["database", "retrieval"],
    metadata: {
      artistName: data.parsedItem.artist
    }
  }).wrap(async () => {
    const startTime = Date.now();
    // First try exact match
    let { data: exactMatch } = await supabase
      .from('artists')
      .select('id, name')
      .ilike('name', data.parsedItem.artist)
      .single();

    if (exactMatch) {
      return {
        ...data,
        parsedItem: {
          ...data.parsedItem,
          artistId: exactMatch.id
        }
      };
    }

    // Simple string similarity function (Levenshtein distance based)
    const stringSimilarity = (str1, str2) => {
      const len1 = str1.length;
      const len2 = str2.length;
      const matrix = Array(len2 + 1).fill().map(() => Array(len1 + 1).fill(0));

      for (let i = 0; i <= len1; i++) matrix[0][i] = i;
      for (let j = 0; j <= len2; j++) matrix[j][0] = j;

      for (let j = 1; j <= len2; j++) {
        for (let i = 1; i <= len1; i++) {
          const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
          matrix[j][i] = Math.min(
            matrix[j][i - 1] + 1,
            matrix[j - 1][i] + 1,
            matrix[j - 1][i - 1] + cost
          );
        }
      }

      const distance = matrix[len2][len1];
      const maxLength = Math.max(len1, len2);
      return 1 - (distance / maxLength);
    }

    // If no exact match, try fuzzy search
    const { data: fuzzyMatches } = await supabase
      .from('artists')
      .select('id, name')
      .textSearch('name', data.parsedItem.artist, {
        config: 'english',
        type: 'websearch'
      });

    // Check if any fuzzy matches are close enough (>80% similar)
    const closeMatch = fuzzyMatches?.find(artist => {
      const similarity = stringSimilarity(
        artist.name.toLowerCase(),
        data.parsedItem.artist.toLowerCase()
      );
      return similarity > 0.8;
    });

    if (closeMatch) {
      return {
        ...data,
        parsedItem: {
          ...data.parsedItem,
          artistId: closeMatch.id
        }
      };
    }

    // If no matches, create new artist
    const { data: newArtist, error } = await supabase
      .from('artist')
      .insert({ name: data.parsedItem.artist })
      .select('id')
      .single();

    if (error) throw error;

    await langsmithClient.logMetrics({
      metrics: {
        resolution_time_ms: Date.now() - startTime,
        exact_match_found: !!exactMatch,
        fuzzy_match_found: !!closeMatch,
        new_artist_created: !exactMatch && !closeMatch
      },
      name: "artist_resolution_metrics"
    });

    return {
      ...data,
      parsedItem: {
        ...data.parsedItem,
        artistId: newArtist.id
      }
    };
  });
});

// Database storage node with tracing
emailProcessingGraph.addNode('storeRecord', async (data) => {
  return await langsmithClient.createTracer({
    name: "store_record",
    tags: ["database", "storage"],
    metadata: {
      valid,
      artistId: data.artistId
    }
  }).wrap(async () => {
    const startTime = Date.now();
    if (!valid) {
      throw new Error('Invalid record data');
    }
    
    const { error } = await supabase
      .from('album')
      .insert({
        artist_id: data.artistId,
        album_title: data.albumTitle,
        release_year: data.releaseYear,
        purchase_date: new Date().toISOString(),
        size: data.format,
        variant: data.variant
      });

    if (error) throw error;
    
    await langsmithClient.logMetrics({
      metrics: {
        storage_time_ms: Date.now() - startTime,
        storage_success: !error
      },
      name: "storage_metrics"
    });

    return { success: true, data };
  });
});

// Connect nodes
emailProcessingGraph
  .addEdge('parseEmail', 'extractData')
  .addEdge('extractData', 'resolveArtist')
  .addEdge('resolveArtist', 'storeRecord');

// Main processing function with trace wrapper
export async function processEmails(entry) {
  return await langsmithClient.createTracer({
    name: "process_emails",
    tags: ["email-processing-agent"],
    metadata: {
      emailId: entry.id,
      threadId: entry.threadId
    }
  }).wrap(async () => {
    const startTime = Date.now();
    try {
      const graph = await emailProcessingGraph.compile();
      const result = await graph.invoke({
        emails: [{
          id: entry.id,
          threadId: entry.threadId,
          snippet: entry.snippet,
          payload: entry.payload,
          labelIds: entry.labelIds,
          internalDate: entry.internalDate
        }]
      });
      
      await langsmithClient.logMetrics({
        metrics: {
          total_processing_time_ms: Date.now() - startTime,
          success: true
        },
        name: "email_processing_metrics"
      });
      
      return {
        success: true,
        emailId: entry.id,
        result
      };
    } catch (error) {
      await langsmithClient.logMetrics({
        metrics: {
          total_processing_time_ms: Date.now() - startTime,
          success: false,
          error: error.message
        },
        name: "email_processing_metrics"
      });
      
      throw error;
    }
  });
}

