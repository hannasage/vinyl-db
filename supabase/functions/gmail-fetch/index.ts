import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { gmail } from "npm:@googleapis/gmail@9.0.0"
import { OAuth2Client } from "npm:google-auth-library@9.6.3"
import { HfInference } from "npm:@huggingface/inference"
// Define CORS headers inline
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
}

interface EmailData {
  id: string
  threadId: string
  senderName: string
  senderEmail: string
  subject: string
  body: string
  timestamp: string
  classification: {
    isReceipt: boolean
    score: number
    explanation: string
  }
}

/**
 * Extracts sender name and email from a Gmail 'From' header
 */
function parseSender(from: string): { name: string; email: string } {
  const match = from.match(/^(?:"?([^"]*)"?\s*)?(?:<(.+)>)?$/)
  return {
    name: match?.[1]?.trim() || '',
    email: (match?.[2] || from).toLowerCase()
  }
}

/**
 * Calls Hugging Face API to classify if an email is a vinyl receipt
 */
async function classifyEmail(subject: string, senderName: string, senderEmail: string): Promise<EmailData['classification']> {
  try {
    // Call Hugging Face API for classification
    const hf = new HfInference(Deno.env.get('HUGGINGFACE_API_KEY'));
    
    // Prepare input text focusing on sender and subject
    const inputText = `From: ${senderName} <${senderEmail}>\nSubject: ${subject}`.substring(0, 500);
    
    // Define our classification labels
    const labels = [
      'vinyl record purchase receipt',
      'vinyl record shipping notification',
      'vinyl record delivery confirmation',
      'musician and band merchandise store',
      'music equipment',
      'unrelated'
    ];

    // Make the API call
    console.log(`Classifying email from: ${senderName} (${senderEmail})`);
    const result = await hf.zeroShotClassification({
      model: 'facebook/bart-large-mnli',
      inputs: inputText,
      parameters: { candidate_labels: labels }
    });

    // Validate response structure
    if (!result || !Array.isArray(result)) {
      console.error('Unexpected API response structure:', result);
      throw new Error('Invalid API response structure');
    }

    // Get the first (and should be only) result
    const classification = result[0];
    if (!classification || !classification.scores || !classification.labels) {
      console.error('Missing classification data:', classification);
      throw new Error('Missing classification data in response');
    }

    // Find the highest scoring label
    const maxScore = Math.max(...classification.scores);
    const maxIndex = classification.scores.indexOf(maxScore);
    const topLabel = classification.labels[maxIndex];

    // Determine if it's a receipt based on the classification
    const isReceipt = topLabel.includes('vinyl') || topLabel.includes('musician')

    // Generate explanation based on classification
    let explanation = isReceipt
      ? `High relevance (${(maxScore * 100).toFixed(1)}%): ${topLabel}`
      : `Low relevance (${(maxScore * 100).toFixed(1)}%): Likely ${topLabel}`;

    console.log('Classification result:', {
      sender: senderEmail,
      topLabel,
      score: maxScore,
      isReceipt
    });

    return {
      isReceipt,
      score: maxScore,
      explanation
    };
  } catch (error) {
    console.error('Classification error:', {
      error,
      message: error.message,
      sender: senderEmail,
      subject
    });
    return {
      isReceipt: false,
      score: 0,
      explanation: `Error in classification: ${error.message}`
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting Gmail fetch process')
    
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

    console.log('Exchanging auth code for tokens')
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Initialize Gmail client
    const gmailClient = gmail({
      version: 'v1',
      auth: oauth2Client
    })

    console.log('Fetching recent emails')
    const response = await gmailClient.users.messages.list({
      userId: 'me',
      maxResults: 7
    })

    if (!response.data.messages) {
      console.log('No messages found')
      return new Response(
        JSON.stringify({ emails: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }

    console.log(`Processing ${response.data.messages.length} emails`)
    
    // Get full message details
    const emails: EmailData[] = await Promise.all(
      response.data.messages.map(async (message) => {
        try {
          console.log(`Processing email ID: ${message.id}`)
          
          const fullMessage = await gmailClient.users.messages.get({
            userId: 'me',
            id: message.id!
          })

          // Extract headers
          const headers = fullMessage.data.payload?.headers || []
          const subject = headers.find(h => h.name === 'Subject')?.value || ''
          const from = headers.find(h => h.name === 'From')?.value || ''
          const { name: senderName, email: senderEmail } = parseSender(from)

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

          // Truncate body to reasonable length
          const truncatedBody = body.substring(0, 4000)

          // Classify the email
          console.log(`Classifying email: ${subject}`)
          const classification = await classifyEmail(subject, senderName, senderEmail)

          return {
            id: message.id!,
            threadId: message.threadId!,
            senderName,
            senderEmail,
            subject,
            body: truncatedBody,
            timestamp: new Date(parseInt(fullMessage.data.internalDate!)).toISOString(),
            classification
          }
        } catch (error) {
          console.error(`Error processing email ${message.id}:`, error)
          throw error
        }
      })
    )

    // Log summary statistics
    const receiptCount = emails.filter(e => e.classification.isReceipt).length
    console.log(`Processing complete. Found ${receiptCount} potential vinyl receipts`)

    return new Response(
      JSON.stringify({ 
        emails,
        summary: {
          total: emails.length,
          receipts: receiptCount
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    )

  } catch (error) {
    console.error('Error in gmail-fetch:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: Deno.env.get('DENO_ENV') === 'development' ? error.stack : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}) 