import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import OpenAI from "https://esm.sh/openai@4.20.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    
    // Debug: Log environment variable status (without exposing sensitive data)
    console.log('OPENAI_API_KEY exists:', !!openaiApiKey)
    console.log('OPENAI_API_KEY length:', openaiApiKey?.length || 0)
    console.log('OPENAI_API_KEY starts with sk-:', openaiApiKey?.startsWith('sk-') || false)
    
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    })

    // Parse request body
    const { imageData, mimeType } = await req.json()
    
    if (!imageData) {
      return new Response(
        JSON.stringify({ error: 'Image data is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate mime type
    if (!mimeType || !['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid mime type. Supported: image/jpeg, image/png, image/webp' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Call OpenAI GPT-4o API with base64 encoded image
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are an expert at identifying vinyl record album covers. Look at this image and identify the album.

IMPORTANT: Return ONLY a valid JSON object with this exact structure:
{
  "title": "Exact Album Title",
  "artist": "Exact Artist Name", 
  "year": "Release Year (YYYY format)",
  "confidence": "high|medium|low"
}

If you cannot identify the album at all, return:
{
  "error": "Unable to identify album"
}

Guidelines:
- Use the exact title and artist as they appear on the cover
- For year, use the original release year if visible, otherwise use "Unknown"
- Set confidence as "high" if you're very certain, "medium" if somewhat certain, "low" if uncertain
- Do not include any additional text or explanations, only the JSON object`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageData}`
              }
            }
          ]
        }
      ],
      max_tokens: 300
    })

    const content = completion.choices[0]?.message?.content

    if (!content) {
      throw new Error('No response content from OpenAI')
    }

    // Try to parse the JSON response
    let albumData
    try {
      // Clean the content to extract just the JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON object found in response')
      }
      
      albumData = JSON.parse(jsonMatch[0])
      
      // Validate the response structure
      if (albumData.error) {
        // This is a valid error response
        return new Response(
          JSON.stringify(albumData),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      // Validate required fields for successful recognition
      if (!albumData.title || !albumData.artist) {
        albumData = { 
          error: 'Incomplete album information',
          partialData: albumData 
        }
      }
      
      // Ensure year is in correct format
      if (albumData.year && albumData.year !== 'Unknown') {
        const yearNum = parseInt(albumData.year)
        if (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 1) {
          albumData.year = 'Unknown'
        }
      }
      
      // Ensure confidence is valid
      if (!['high', 'medium', 'low'].includes(albumData.confidence)) {
        albumData.confidence = 'medium'
      }
      
    } catch (parseError) {
      // If parsing fails, return the raw content as an error
      albumData = { 
        error: 'Invalid response format', 
        rawContent: content,
        parseError: parseError.message
      }
    }

    return new Response(
      JSON.stringify(albumData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in recognize-album function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to recognize album',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 