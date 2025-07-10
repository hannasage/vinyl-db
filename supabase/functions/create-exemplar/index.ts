import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get request body
    const { sessionId, feedbackType, title, description, tags } = await req.json()

    if (!sessionId || !feedbackType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: sessionId and feedbackType' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate feedback type
    if (!['thumbs_up', 'thumbs_down'].includes(feedbackType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid feedback type. Must be thumbs_up or thumbs_down' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the user ID from the session
    const { data: sessionData, error: sessionError } = await supabase
      .from('conversation_sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !sessionData) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Determine exemplar type based on feedback
    const exemplarType = feedbackType === 'thumbs_up' ? 'positive' : 'negative'

    // Generate default title if not provided
    const defaultTitle = title || `${exemplarType === 'positive' ? 'Helpful' : 'Unhelpful'} Conversation`

    // Create the exemplar conversation
    const { data: exemplarData, error: exemplarError } = await supabase
      .from('exemplar_conversations')
      .insert({
        session_id: sessionId,
        user_id: sessionData.user_id,
        exemplar_type: exemplarType,
        title: defaultTitle,
        description: description || null,
        tags: tags || [],
        usage_count: 0,
        is_active: true
      })
      .select('id, title, exemplar_type')
      .single()

    if (exemplarError) {
      console.error('Error creating exemplar:', exemplarError)
      return new Response(
        JSON.stringify({ error: 'Failed to create exemplar conversation' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        exemplar: exemplarData,
        message: `Created ${exemplarType} exemplar conversation`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in create-exemplar function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 