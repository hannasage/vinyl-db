import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { gmail } from "npm:@googleapis/gmail@9.0.0"
import { OAuth2Client } from "npm:google-auth-library@9.6.3"

// Define CORS headers inline
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
}

interface EmailData {
  id: string
  threadId: string
  from: string
  subject: string
  body: string
  timestamp: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize OAuth2 client
    const oauth2Client = new OAuth2Client(
      Deno.env.get('GMAIL_CLIENT_ID'),
      Deno.env.get('GMAIL_CLIENT_SECRET'),
      Deno.env.get('GMAIL_REDIRECT_URI')
    )

    // Get request body
    const { code } = await req.json()

    // If no code provided, return the auth URL
    if (!code) {
      const scopes = ['https://www.googleapis.com/auth/gmail.readonly']
      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
      })

      return new Response(
        JSON.stringify({ url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Initialize Gmail client
    const gmailClient = gmail({
      version: 'v1',
      auth: oauth2Client
    })

    // Fetch recent emails
    const response = await gmailClient.users.messages.list({
      userId: 'me',
      maxResults: 25
    })

    if (!response.data.messages) {
      return new Response(
        JSON.stringify({ emails: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }

    // Get full message details
    const emails: EmailData[] = await Promise.all(
      response.data.messages.map(async (message) => {
        const fullMessage = await gmailClient.users.messages.get({
          userId: 'me',
          id: message.id!
        })

        // Extract headers
        const headers = fullMessage.data.payload?.headers || []
        const subject = headers.find(h => h.name === 'Subject')?.value || ''
        const from = headers.find(h => h.name === 'From')?.value || ''

        // Extract body
        let body = ''
        if (fullMessage.data.payload?.parts) {
          // Handle multipart message
          for (const part of fullMessage.data.payload.parts) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
              body = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'))
              break
            }
          }
        } else if (fullMessage.data.payload?.body?.data) {
          // Handle single part message
          body = atob(fullMessage.data.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'))
        }

        return {
          id: message.id!,
          threadId: message.threadId!,
          from,
          subject,
          body: body.substring(0, 4000), // Limit body length
          timestamp: new Date(parseInt(fullMessage.data.internalDate!)).toISOString()
        }
      })
    )

    return new Response(
      JSON.stringify({ emails }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    )

  } catch (error) {
    console.error('Error in gmail-fetch:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}) 