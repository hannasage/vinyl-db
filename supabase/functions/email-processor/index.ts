import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import { gmail_v1 } from "npm:@googleapis/gmail@9.0.0"
import { gmail } from "npm:@googleapis/gmail@9.0.0"
import { OAuth2Client } from "npm:google-auth-library@9.6.3"
import OpenAI from "npm:openai@4.28.0"
import { z } from "npm:zod@3.22.4"
import { corsHeaders } from '../_shared/cors.ts'

// Email processing types
type EmailType = 'purchase' | 'shipping' | 'delivery' | 'unknown'

interface ProcessingState {
  emailType: EmailType
  emailData: {
    from: string
    senderEmail: string
    senderName: string
    subject: string
    content: string
  }
  retailer: {
    isKnown: boolean
    id?: string
    name: string
    email: string
  }
  parsedData?: {
    size: number
    title: string
    artistName: string
    purchaseDate: string
    variant: string
    deliveryDate?: string
  }
  artist?: {
    id: string
    name: string
  }
  album?: {
    id?: string
    artist_id: string
    title: string
    size: number
    variant: string
    purchase_date: string
    acquired_date?: string
    receipt_id?: string
  }
  receipt?: {
    id: string
    album_id: string
    receipt: string
  }
}

// Zod schemas
const EmailRelevanceSchema = z.object({
  isRelevant: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  emailType: z.enum(['purchase', 'shipping', 'delivery', 'unknown'])
})

const EmailParseResultSchema = z.object({
  size: z.number().int().positive(),
  title: z.string().min(1),
  artistName: z.string().min(1),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  variant: z.string(),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
})

// Initialize clients
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Initialize Gmail OAuth2 client
const oauth2Client = new OAuth2Client(
  Deno.env.get('GMAIL_CLIENT_ID'),
  Deno.env.get('GMAIL_CLIENT_SECRET'),
  Deno.env.get('GMAIL_REDIRECT_URI')
);

// Set credentials if we have them
const tokens = Deno.env.get('GMAIL_REFRESH_TOKEN');
if (tokens) {
  oauth2Client.setCredentials({
    refresh_token: tokens
  });
}

async function getRecentEmails(daysBack: number = 7): Promise<gmail_v1.Schema$Message[]> {
  try {
    console.log('Using OAuth2 authentication')
    
    const gmailClient = gmail({
      version: 'v1',
      auth: oauth2Client
    })
    
    // List messages
    const response = await gmailClient.users.messages.list({
      userId: 'me',
      q: `newer_than:${daysBack}d`,
      maxResults: 50
    })

    if (!response.data.messages) {
      console.log('No messages found')
      return []
    }

    // Get full message details
    const fullMessages = await Promise.all(
      response.data.messages.map(async (message) => {
        const emailData = await gmailClient.users.messages.get({
          userId: 'me',
          id: message.id!,
        })
        return emailData.data
      })
    )

    return fullMessages
  } catch (error) {
    console.error('Error fetching emails:', error)
    return []
  }
}

async function extractEmailContent(message: gmail_v1.Schema$Message): Promise<string> {
  const parts = message.payload?.parts || []
  let content = ''

  // First try to get content from parts
  for (const part of parts) {
    if (part.mimeType === 'text/plain') {
      const body = part.body?.data || ''
      content += atob(body.replace(/-/g, '+').replace(/_/g, '/'))
    }
  }

  // If no parts with content, try the main body
  if (!content && message.payload?.body?.data) {
    content = atob(message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'))
  }

  return content
}

async function isKnownRetailer(state: ProcessingState): Promise<ProcessingState> {
  const { data: retailers, error } = await supabase
    .from('retailer')
    .select('id, name, email')
    .eq('email', state.retailer.email)
    .limit(1)

  if (error) {
    console.error('Error checking retailer:', error)
    return state
  }

  if (retailers.length > 0) {
    state.retailer = {
      isKnown: true,
      id: retailers[0].id,
      name: retailers[0].name,
      email: retailers[0].email
    }
  }

  return state
}

async function addNewRetailer(state: ProcessingState): Promise<ProcessingState> {
  if (state.retailer.isKnown) return state

  const { error } = await supabase
    .from('retailer')
    .insert({ 
      name: state.retailer.name, 
      email: state.retailer.email 
    })

  if (error) {
    console.error('Error adding new retailer:', error)
  } else {
    console.log(`Added new trusted retailer: ${state.retailer.name} (${state.retailer.email})`)
    state.retailer.isKnown = true
  }

  return state
}

async function isRelevantEmail(headers: { name: string; value: string }[]): Promise<ProcessingState | null> {
  const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || ''
  const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || ''
  
  // Extract email and name from From header
  const emailMatch = from.match(/<([^>]+)>/) || from.match(/([^\s]+@[^\s]+)/)
  if (!emailMatch) {
    console.log(`Could not find sender email header: ${from}`)
    return null
  }
  
  const email = emailMatch[1].toLowerCase()
  const name = from.split('<')[0].trim() || email.split('@')[0]

  // Initialize state
  let state: ProcessingState = {
    emailType: 'unknown',
    emailData: {
      from,
      senderEmail: email,
      senderName: name,
      subject,
      content: ''
    },
    retailer: {
      isKnown: false,
      name,
      email
    }
  }

  // Check known retailers first
  state = await isKnownRetailer(state)
  if (state.retailer.isKnown) {
    // Simple pattern matching for known retailers
    if (subject.toLowerCase().includes('delivered') || subject.toLowerCase().includes('delivery')) {
      state.emailType = 'delivery'
      return state
    }
    if (subject.toLowerCase().includes('shipped') || subject.toLowerCase().includes('shipping')) {
      state.emailType = 'shipping'
      return state
    }
    if (subject.toLowerCase().includes('order') || subject.toLowerCase().includes('purchase')) {
      state.emailType = 'purchase'
      return state
    }
  }

  // For unknown senders, use GPT
  const prompt = `
    Analyze this email sender and subject to determine if it's about a vinyl record:
    
    From: ${from}
    Subject: ${subject}

    Return a JSON object with:
    - isRelevant: boolean indicating if this is about vinyl records
    - confidence: number between 0-1 indicating confidence level
    - reasoning: brief explanation of the decision
    - emailType: one of ['purchase', 'shipping', 'delivery', 'unknown'] based on the subject
  `

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a precise assistant that analyzes email metadata to detect vinyl record related emails."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    })

    const result = EmailRelevanceSchema.parse(
      JSON.parse(completion.choices[0].message.content)
    )

    console.log({
      timestamp: new Date().toISOString(),
      from,
      subject,
      analysis: result
    })

    if (result.isRelevant && result.confidence >= 0.8) {
      state = await addNewRetailer(state)
    }

    if (result.isRelevant && result.confidence > 0.7) {
      state.emailType = result.emailType
      return state
    }
  } catch (error) {
    console.error('Error analyzing email relevance:', error)
  }

  return null
}

async function parseEmailWithAI(state: ProcessingState): Promise<ProcessingState> {
  if (state.emailType === 'shipping') {
    return state // Skip processing shipping notifications for now
  }

  const prompt = `
    Extract the following information from this email about a vinyl record:
    - Record size (as a whole number without inches notation)
    - Title of the album
    - Artist name
    - ${state.emailType === 'delivery' ? 'Delivery' : 'Purchase'} date (in YYYY-MM-DD format)
    - Pressing/color variant (including descriptions like splatter, color-in-color, split)
    
    Format the response as a JSON object with these exact keys: size, title, artistName, ${state.emailType === 'delivery' ? 'deliveryDate' : 'purchaseDate'}, variant
    
    Email content:
    ${state.emailData.content}
  `

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { 
          role: "system", 
          content: "You are a precise assistant that extracts vinyl record information from emails." 
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    })

    const result = EmailParseResultSchema.parse(
      JSON.parse(completion.choices[0].message.content)
    )

    state.parsedData = result
    console.log({
      timestamp: new Date().toISOString(),
      emailType: state.emailType,
      parsed: result
    })

    return state
  } catch (error) {
    console.error('Error parsing email content:', error)
    throw error
  }
}

async function findOrCreateArtist(state: ProcessingState): Promise<ProcessingState> {
  if (!state.parsedData?.artistName) return state

  const { data: artists, error } = await supabase
    .from('artist')
    .select('id, name')
    .textSearch('name', state.parsedData.artistName, {
      type: 'websearch',
      config: 'english'
    })
    .limit(1)

  if (error) {
    console.error(`Error finding artist ${state.parsedData.artistName}:`, error)
    return state
  }

  if (artists.length > 0) {
    state.artist = artists[0]
    return state
  }

  // Insert new artist
  const { data: newArtist, error: insertError } = await supabase
    .from('artist')
    .insert({ name: state.parsedData.artistName })
    .select('id, name')
    .single()

  if (insertError) {
    console.error(`Error inserting artist ${state.parsedData.artistName}:`, insertError)
    return state
  }

  state.artist = newArtist
  console.log(`Created new artist: ${newArtist.name} (${newArtist.id})`)
  return state
}

async function upsertAlbum(state: ProcessingState): Promise<ProcessingState> {
  if (!state.artist?.id || !state.parsedData) return state

  if (state.emailType === 'purchase') {
    // Create new album record
    const albumData = {
      artist_id: state.artist.id,
      title: state.parsedData.title,
      size: state.parsedData.size,
      variant: state.parsedData.variant,
      purchase_date: state.parsedData.purchaseDate
    }

    const { data: album, error } = await supabase
      .from('album')
      .insert(albumData)
      .select()
      .single()

    if (error) {
      console.error(`Error inserting album ${state.parsedData.title}:`, error)
      return state
    }

    state.album = album
    console.log(`Created new album: ${album.title}`)
  } else if (state.emailType === 'delivery' && state.parsedData.deliveryDate) {
    // Find and update existing album
    const { data: albums, error: findError } = await supabase
      .from('album')
      .select()
      .eq('artist_id', state.artist.id)
      .eq('title', state.parsedData.title)
      .is('acquired_date', null)
      .order('created_at', { ascending: false })
      .limit(1)

    if (findError || !albums?.length) {
      console.error(`Error finding album to update delivery for ${state.parsedData.title}:`, findError)
      return state
    }

    const { error: updateError } = await supabase
      .from('album')
      .update({ acquired_date: state.parsedData.deliveryDate })
      .eq('id', albums[0].id)

    if (updateError) {
      console.error(`Error updating delivery date for album ${state.parsedData.title}:`, updateError)
      return state
    }

    state.album = { ...albums[0], acquired_date: state.parsedData.deliveryDate }
    console.log(`Updated delivery date for album: ${albums[0].title}`)
  }

  return state
}

async function storeReceipt(state: ProcessingState): Promise<ProcessingState> {
  if (!state.album?.id || !state.retailer.id) { return state }

  try {
    // Insert receipt
    const { data: receipt, error: insertError } = await supabase
      .from('receipt')
      .insert({
        album_id: state.album.id,
        retailer_id: state.retailer.id,
        receipt: state.emailData.content
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error storing receipt:', insertError)
      return state
    }

    // Update album with receipt reference
    const { error: updateError } = await supabase
      .from('album')
      .update({ receipt_id: receipt.id })
      .eq('id', state.album.id)

    if (updateError) {
      console.error('Error updating album with receipt reference:', updateError)
      return state
    }

    state.receipt = receipt
    console.log(`Stored receipt for album: ${state.album.title}`)
    return state
  } catch (error) {
    console.error('Error in receipt storage: ', error)
    return state
  }
}

async function processEmails() {
  try {
    const results: ProcessingState[] = []

    // Get recent emails from Gmail
    const emails = await getRecentEmails()
    console.log(`Found ${emails.length} recent emails`)

    // Process each email
    for (const email of emails) {
      try {
        // Check relevance and initialize state
        const state = await isRelevantEmail(email.payload?.headers || [])
        if (!state) continue

        // Extract and add email content to state
        state.emailData.content = await extractEmailContent(email)

        // Skip shipping notifications for now
        if (state.emailType === 'shipping') {
          console.log('Skipping shipping notification')
          continue
        }

        // Process email content
        const withParsedData = await parseEmailWithAI(state)
        const withArtist = await findOrCreateArtist(withParsedData)
        const withAlbum = await upsertAlbum(withArtist)
        const finalState = withAlbum.emailType === 'purchase' 
          ? await storeReceipt(withAlbum) 
          : withAlbum

        results.push(finalState)
      } catch (error) {
        console.error('Error processing email:', error)
      }
    }

    return {
      success: true,
      processed: results.length,
      details: results
    }
  } catch (error) {
    console.error('Error in email processor:', error)
    return { success: false, error: error.message }
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code } = await req.json()

    // If no code provided, return the auth URL
    if (!code) {
      const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
      ];

      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        redirect_uri: Deno.env.get('GMAIL_REDIRECT_URI')
      });

      return new Response(
        JSON.stringify({ url }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      )
    }

    // Process with provided code
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Store the refresh token securely
    if (tokens.refresh_token) {
      // TODO: Store the refresh token securely in your database
      console.log('Received refresh token:', tokens.refresh_token)
    }

    // Process emails
    const result = await processEmails()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to process emails')
    }

    // Transform the results into album format
    const albums = (result.details || []).map(email => ({
      id: email.album?.id,
      artist_id: email.artist?.id,
      title: email.parsedData?.title,
      artist_name: email.parsedData?.artistName,
      size: email.parsedData?.size,
      variant: email.parsedData?.variant,
      purchase_date: email.parsedData?.purchaseDate,
      acquired_date: email.parsedData?.deliveryDate,
      receipt_id: email.receipt?.id
    })).filter(album => album.id && album.title)

    return new Response(
      JSON.stringify({ albums }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      }
    )
  }
})