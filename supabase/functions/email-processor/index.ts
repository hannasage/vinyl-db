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

// Zod schemas for GPT responses
const EmailRelevanceSchema = z.object({
  isRelevant: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string()
})

const EmailParseResultSchema = z.object({
  size: z.number().int().positive(),
  title: z.string().min(1),
  artistName: z.string().min(1),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  variant: z.string()
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

const RELEVANT_SENDERS = [
  { email: 'orders@turntablelab.com', name: 'Turntable Lab' },
  { email: 'vinyl@roughtraderecords.com', name: 'Rough Trade' },
  // Add other relevant senders
]

async function isRelevantEmail(headers: { name: string; value: string }[]) {
  const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || ''
  const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || ''

  const prompt = `
    Analyze this email sender and subject to determine if it's likely a vinyl record purchase orconfirmation:
    
    From: ${from}
    Subject: ${subject}

    Return a JSON object with:
    - isRelevant: boolean indicating if this is likely a vinyl purchase email
    - confidence: number between 0-1 indicating confidence level
    - reasoning: brief explanation of the decision
  `

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a precise assistant that analyzes email metadata to detect vinyl record purchase confirmations."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    })

    const result = EmailRelevanceSchema.parse(
      JSON.parse(completion.choices[0].message.content)
    )

    // Log the analysis for monitoring
    console.log({
      timestamp: new Date().toISOString(),
      from,
      subject,
      analysis: result
    })

    return result.isRelevant && result.confidence > 0.7
  } catch (error) {
    console.error('Error analyzing email relevance: ', error)
    // Fall back to basic keyword matching if AI fails
    return RELEVANT_SENDERS.some(sender =>
      from.toLowerCase().includes(sender.email) &&
      (subject.toLowerCase().includes('order') || subject.toLowerCase().includes('purchase'))
    )
  }
}

async function parseEmailWithAI(content: string): Promise<EmailParseResult> {
  const prompt = `
    Extract the following information from this email about a vinyl record purchase:
    - Record size (as a whole number without inches notation)
    - Title of the album
    - Artist name
    - Purchase date (in YYYY-MM-DD format)
    - Pressing/color variant (including descriptions like splatter, color-in-color, split)
    
    Format the response as a JSON object with these exact keys: size, title, artistName, purchaseDate, variant
    
    Email content:
    ${content}
  `

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { 
          role: "system", 
          content: "You are a precise assistant that extracts vinyl record purchase information from emails. Return only the JSON object with the requested fields." 
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    })

    const result = EmailParseResultSchema.parse(
      JSON.parse(completion.choices[0].message.content)
    )

    console.log({
      timestamp: new Date().toISOString(),
      parsed: result
    })

    return result;
  } catch (error) {
    console.error('Error parsing email content: ', error)
    throw new Error('Failed to extract album information from email')
  }
}

async function findArtistId(artistName: string): Promise<string | null> {
  const { data: artists, error } = await supabase
    .from('artist')
    .select('id, name')
    .textSearch('name', artistName, {
      type: 'websearch',
      config: 'english'
    })
    .limit(1)

    if (error) {
      console.error(`Artist not found ${artistName}: `, error)
      return null
    }

  if (!artists.length) {
    // Insert new artist
    const { data: newArtist, error: insertError } = await supabase
      .from('artist')
      .insert({ name: artistName })
      .select('id')
      .single()

    if (insertError) {
      console.error(`Error inserting artist ${artistName}: `, insertError)
      return null
    }

    console.log(`Inserted artist ${artistName}: ${newArtist}`)
    return newArtist.id
  }

  console.log(`Found artist ${artistName}: ${artists[0].id}`)
  return artists[0].id
}

async function processEmails() {
  try {
    // Use test emails instead of Gmail API
    const relevantEmails: TestEmail[] = []

    // Filter relevant emails
    for (const email of TEST_EMAILS) {
      if (await isRelevantEmail(email.headers)) {
        relevantEmails.push(email)
      }
    }

    console.log(`Found ${relevantEmails.length} relevant emails`)

    // Process each relevant email
    const processedEmails: Array<{
      from: string | undefined,
      subject: string | undefined,
      parsed: EmailParseResult
    }> = []

    for (const email of relevantEmails) {
      try {
        const parsedData = await parseEmailWithAI(email.content)
        const artistId = await findArtistId(parsedData.artistName)
        
        if (!artistId) {
          console.log(`Artist not found: ${parsedData.artistName}`)
          continue
        }

        // Prepare album record
        const albumData: Partial<Album> = {
          artist_id: artistId,
          title: parsedData.title,
          size: parsedData.size,
          variant: parsedData.variant,
          purchase_date: parsedData.purchaseDate,
        }

        // Insert into database
        const { error } = await supabase
          .from('album')
          .insert(albumData)

        if (error) {
          console.error(`Error inserting album ${parsedData.title}: `, error)
        } else {
          processedEmails.push({
            from: email.headers.find(h => h.name === 'from')?.value,
            subject: email.headers.find(h => h.name === 'subject')?.value,
            parsed: parsedData
          })
        }
      } catch (error) {
        console.error('Error processing email:', error)
      }
    }

    return { 
      success: true, 
      processed: relevantEmails.length,
      details: processedEmails
    }
  } catch (error) {
    console.error('Error processing emails:', error)
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