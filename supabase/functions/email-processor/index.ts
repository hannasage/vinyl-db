import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
// import { gmail_v1, google } from "@googleapis/gmail"
import OpenAI from "npm:openai@4.28.0"
import { z } from "npm:zod@3.22.4"

// Types for our database
interface Artist {
  id: string
  name: string
  // Add other relevant fields
}

interface Album {
  id: string
  artist_id: string
  title: string
  size: number
  variant: string
  purchase_date: string
  created_at?: string
  updated_at?: string
}

// Test data types to mock Gmail API responses
interface TestEmail {
  headers: {
    name: string
    value: string
  }[]
  content: string
}

// Test email data
const TEST_EMAILS: TestEmail[] = [
  {
    headers: [
      { name: "from", value: "orders@turntablelab.com" },
      { name: "subject", value: "Your Vinyl Order Has Shipped!" },
    ],
    content: `
      Thank you for your order from Turntable Lab!

      Your order has been shipped and is on its way:

      Order Details:
      - Artist: Taylor Swift
      - Album: Red (Taylors Version)
      - Format: 4xLP, 12" Vinyl, Red
      - Price: $45.99
      
      Order Date: 2024-03-15
      Tracking Number: 9400123456789012345678
    `
  },
  {
    headers: [
      { name: "from", value: "info@recordstore.com" },
      { name: "subject", value: "Order Confirmation #12345" },
    ],
    content: `
      Thanks for shopping with us!

      We've received your order and will process it shortly.
      
      Items:
      1x T-Shirt - Band Logo (Size L)
      1x CD - Greatest Hits
      1x Vinyl Record - Lana Del Rey - Did You Know That There's A Tunnel Under Ocean Blvd (Transparent Green)
      
      Date: 2024-03-14
    `
  },
  {
    headers: [
      { name: "from", value: "newsletter@spotify.com" },
      { name: "subject", value: "New Releases for You" },
    ],
    content: `
      Check out these new releases from artists you follow:

      - New singles from your favorite artists
      - Playlist updates
      - Concert announcements in your area
      
      Open Spotify to listen now!
    `
  }
]

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
    delivery_date?: string
  }
}

// Update Zod schemas
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
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  variant: z.string(),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
})

type EmailParseResult = z.infer<typeof EmailParseResultSchema>

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')
})

// Initialize Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Comment out Gmail initialization
/*
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(Deno.env.get('GMAIL_CREDENTIALS') || '{}'),
  scopes: SCOPES,
})
const gmail = google.gmail({ version: 'v1', auth })
*/

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
      .is('delivery_date', null)
      .order('created_at', { ascending: false })
      .limit(1)

    if (findError || !albums?.length) {
      console.error(`Error finding album to update delivery for ${state.parsedData.title}:`, findError)
      return state
    }

    const { error: updateError } = await supabase
      .from('album')
      .update({ delivery_date: state.parsedData.deliveryDate })
      .eq('id', albums[0].id)

    if (updateError) {
      console.error(`Error updating delivery date for album ${state.parsedData.title}:`, updateError)
      return state
    }

    state.album = { ...albums[0], delivery_date: state.parsedData.deliveryDate }
    console.log(`Updated delivery date for album: ${albums[0].title}`)
  }

  return state
}

async function processEmails() {
  try {
    const results: ProcessingState[] = []

    // Process each email
    for (const email of TEST_EMAILS) {
      try {
        // Check relevance and initialize state
        const state = await isRelevantEmail(email.headers)
        if (!state) continue

        // Add email content to state
        state.emailData.content = email.content

        // Skip shipping notifications for now
        if (state.emailType === 'shipping') {
          console.log('Skipping shipping notification')
          continue
        }

        // Process email content
        const withParsedData = await parseEmailWithAI(state)
        const withArtist = await findOrCreateArtist(withParsedData)
        const finalState = await upsertAlbum(withArtist)

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

serve(async (_req) => {
  try {
    const result = await processEmails()
    return new Response(JSON.stringify(result, null, 2), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})