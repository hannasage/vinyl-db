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
    timestamp: string
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
  title: z.string().min(1).nullable(),
  artistName: z.string().min(1).nullable(),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  variant: z.string().nullable(),
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
    
    // List messages - reduced from default to just 3 most recent
    const response = await gmailClient.users.messages.list({
      userId: 'me',
      q: `newer_than:${daysBack}d`,
      maxResults: 3  // Reduced from default to save on API calls
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
  let htmlContent = ''
  let plainContent = ''

  // Helper function to decode base64
  const decodeBase64 = (data: string) => {
    return atob(data.replace(/-/g, '+').replace(/_/g, '/'))
  }

  // First try to get content from parts
  if (parts.length > 0) {
    // Get both HTML and plain text content if available
    const htmlPart = parts.find(part => part.mimeType === 'text/html')
    const plainPart = parts.find(part => part.mimeType === 'text/plain')

    if (htmlPart?.body?.data) {
      htmlContent = decodeBase64(htmlPart.body.data).substring(0, 4000) // Limit content length
    }
    if (plainPart?.body?.data) {
      plainContent = decodeBase64(plainPart.body.data).substring(0, 2000) // Limit content length
    }
  }

  // If no parts with content, try the main body
  if (!htmlContent && !plainContent && message.payload?.body?.data) {
    const content = decodeBase64(message.payload.body.data).substring(0, 4000) // Limit content length
    if (message.payload.mimeType === 'text/html') {
      htmlContent = content
    } else {
      plainContent = content
    }
  }

  // Combine both contents, with a clear separator if both exist
  let finalContent = ''
  if (htmlContent) finalContent += htmlContent
  if (plainContent) {
    if (htmlContent) finalContent += '\n\n--- Plain Text Content ---\n\n'
    finalContent += plainContent
  }

  // Truncate final content if it's still too long
  finalContent = finalContent.substring(0, 6000)
  
  console.log('Extracted email content length:', finalContent.length)
  return finalContent
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

async function isRelevantEmail(headers: gmail_v1.Schema$MessagePartHeader[]): Promise<ProcessingState | null> {
  const from = headers.find(h => h.name === 'From')?.value || ''
  const subject = headers.find(h => h.name === 'Subject')?.value || ''
  const internalDate = headers.find(h => h.name === 'Date')?.value || new Date().toISOString()

  const name = from.match(/^"?([^"]*)"?\s*(?:<.*>)?$/)?.[1]?.trim() || ''
  const email = from.match(/<(.+)>/)?.[1]?.toLowerCase() || from.toLowerCase()

  const prompt = `
    Analyze for vinyl/music purchase:
    From: ${from}
    Subject: ${subject}

    Is this a potential music/vinyl purchase email?
    Consider:
    - Vinyl/music retailers
    - Order confirmations
    - Music-related senders
    - Artist/label names

    Format as JSON:
    - isRelevant (boolean)
    - confidence (number 0-1)
    - reasoning (string)
    - emailType ("purchase"/"shipping"/"delivery"/"unknown")
  `

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { 
          role: "system", 
          content: "You identify potential music/vinyl purchase emails. Err on inclusion." 
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 150  // Limit token usage
    })

    const result = EmailRelevanceSchema.parse(
      JSON.parse(completion.choices[0].message.content)
    )

    if (!result.isRelevant) {
      return null
    }

    return {
      emailType: result.emailType,
      emailData: {
        from,
        senderEmail: email,
        senderName: name,
        subject,
        content: '',
        timestamp: internalDate
      },
      retailer: {
        isKnown: false,
        name: name || email,
        email
      }
    }
  } catch (error) {
    console.error('Error checking email relevance:', error)
    return null
  }
}

async function parseEmailWithAI(state: ProcessingState): Promise<ProcessingState> {
  if (state.emailType === 'shipping') {
    return state // Skip processing shipping notifications for now
  }

  // First, check if this is specifically a vinyl record purchase
  const vinylCheckPrompt = `
    Check if this is a vinyl record purchase:
    From: ${state.emailData.from}
    Subject: ${state.emailData.subject}
    Content: ${state.emailData.content}

    Look for:
    - "vinyl", "LP", "record", "12\"", "7\"", "33 RPM", "45 RPM"
    - Physical record descriptions
    - Vinyl format specs
    
    JSON response:
    - isVinyl: boolean (true only if clearly vinyl)
    - confidence: number (0-1)
    - reasoning: string (brief)
  `

  try {
    console.log('Checking if purchase is specifically vinyl...')
    const vinylCheck = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { 
          role: "system", 
          content: "You strictly identify vinyl record purchases. Only confirm if clear evidence exists." 
        },
        { role: "user", content: vinylCheckPrompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 150
    })
    
    const vinylResult = JSON.parse(vinylCheck.choices[0].message.content)
    console.log('Vinyl check result:', vinylResult)

    if (!vinylResult.isVinyl) {
      console.log('Not a vinyl purchase, skipping further processing')
      return state
    }

    // Continue with regular parsing if it is a vinyl purchase
    const prompt = `
    Extract vinyl record info from email:
    From: ${state.emailData.from}
    Subject: ${state.emailData.subject}
    Content: ${state.emailData.content}

    Extract:
    - Record size (number)
      * Single/7" = 7
      * LP/12" = 12
      * Default = 12
    - Album title (null if uncertain)
    - Artist name (null if uncertain)
    - Variant/color (null if unspecified)
    
    Return JSON: {
      size: number,
      title: string | null,
      artistName: string | null,
      variant: string | null
    }
  `

    console.log('Parsing vinyl purchase details...')
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { 
          role: "system", 
          content: "You extract vinyl record details from emails. Return null for uncertain fields." 
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 250
    })
    
    console.log('Completion: ', completion.choices[0].message.content)
    
    // Parse the completion and apply transformations
    const rawResult = JSON.parse(completion.choices[0].message.content)
    
    // Transform size to number and apply defaults
    const transformedResult = {
      ...rawResult,
      size: typeof rawResult.size === 'string' ? parseInt(rawResult.size, 10) : (rawResult.size || 12),
      // Keep null values if they were returned
      title: rawResult.title || null,
      artistName: rawResult.artistName || null,
      variant: rawResult.variant || null,
      // Add the date from the email timestamp
      [state.emailType === 'delivery' ? 'deliveryDate' : 'purchaseDate']: new Date(state.emailData.timestamp).toISOString().split('T')[0]
    }
    
    const result = EmailParseResultSchema.parse(transformedResult)

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
    console.log('=== Starting Email Processing ===')
    const results: ProcessingState[] = []

    // Get recent emails from Gmail
    console.log('Fetching recent emails...')
    const emails = await getRecentEmails()
    console.log(`Found ${emails.length} recent emails`)

    // Process each email
    for (const email of emails) {
      try {
        console.log('\n--- Processing Email ---')
        console.log('Subject:', email.payload?.headers?.find(h => h.name === 'Subject')?.value)
        
        // Check relevance and initialize state
        console.log('Checking email relevance...')
        const state = await isRelevantEmail(email.payload?.headers || [])
        if (!state) {
          console.log('Email not relevant, skipping')
          continue
        }
        console.log('Email is relevant:', { type: state.emailType })

        // Extract and add email content to state
        console.log('Extracting email content...')
        state.emailData.content = await extractEmailContent(email)
        console.log('Content extracted, length:', state.emailData.content.length)

        // Skip shipping notifications for now
        if (state.emailType === 'shipping') {
          console.log('Skipping shipping notification')
          continue
        }

        // Process email content
        console.log('Parsing email with AI...')
        const withParsedData = await parseEmailWithAI(state)
        
        // Skip if not a vinyl record or if parsing failed
        if (!withParsedData.parsedData) {
          console.log('Not a vinyl record or parsing failed, skipping')
          continue
        }
        
        console.log('AI parsing complete:', withParsedData.parsedData)
        
        console.log('Finding or creating artist...')
        const withArtist = await findOrCreateArtist(withParsedData)
        
        // Skip if artist couldn't be determined
        if (!withArtist.artist) {
          console.log('Artist could not be determined, skipping')
          continue
        }
        
        console.log('Artist processed:', { 
          id: withArtist.artist?.id, 
          name: withArtist.artist?.name 
        })
        
        console.log('Upserting album...')
        const withAlbum = await upsertAlbum(withArtist)
        
        // Skip if album couldn't be created
        if (!withAlbum.album) {
          console.log('Album could not be created, skipping')
          continue
        }
        
        console.log('Album processed:', { 
          id: withAlbum.album?.id, 
          title: withAlbum.album?.title 
        })

        const finalState = withAlbum.emailType === 'purchase' 
          ? await storeReceipt(withAlbum) 
          : withAlbum

        // Only add to results if we have all required data
        if (finalState.album && finalState.artist && finalState.parsedData) {
          results.push(finalState)
          console.log('Email processing complete and added to results')
        }
      } catch (error) {
        console.error('Error processing email:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          subject: email.payload?.headers?.find(h => h.name === 'Subject')?.value
        })
      }
    }

    console.log('\n=== Email Processing Summary ===')
    console.log('Total vinyl records found:', results.length)
    console.log('Processed vinyl records:', results.map(r => ({
      type: r.emailType,
      album: r.album?.title,
      artist: r.artist?.name
    })))

    return {
      success: true,
      processed: results.length,
      details: results
    }
  } catch (error) {
    console.error('Error in email processor:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
    return { success: false, error: error.message }
  }
}

serve(async (req) => {
  console.log('=== Starting Email Processor ===')
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code } = await req.json()
    console.log('Request received:', code ? 'With auth code' : 'No auth code')

    // If no code provided, return the auth URL
    if (!code) {
      console.log('No auth code provided, generating auth URL')
      const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
      ];

      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        redirect_uri: Deno.env.get('GMAIL_REDIRECT_URI')
      });

      console.log('Generated auth URL:', url)
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

    console.log('Getting tokens from auth code...')
    const { tokens } = await oauth2Client.getToken(code)
    console.log('Tokens received:', {
      access_token: tokens.access_token ? 'Present' : 'Missing',
      refresh_token: tokens.refresh_token ? 'Present' : 'Missing',
      expiry_date: tokens.expiry_date
    })
    
    oauth2Client.setCredentials(tokens)
    console.log('Credentials set on OAuth2 client')

    // Store the refresh token securely
    if (tokens.refresh_token) {
      console.log('New refresh token received - should be stored securely')
    }

    // Process emails
    console.log('Starting email processing...')
    const result = await processEmails()
    console.log('Email processing complete:', {
      success: result.success,
      processed: result.details?.length || 0,
      error: result.error || null
    })
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to process emails')
    }

    // Transform the results into album format
    console.log('Transforming results into album format...')
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

    console.log('Processing complete. Found albums:', albums.length)
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
    console.error('Error in email processor:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
    return new Response(
      JSON.stringify({ 
        error: error.message,
        type: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
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