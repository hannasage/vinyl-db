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
 * Clean text by removing HTML, escape characters, and normalizing whitespace
 */
function cleanText(text: string): string {
  return text
    // First clean HTML if present
    .replace(/<style[^>]*>.*?<\/style>/gs, '') // Remove style tags and content
    .replace(/<script[^>]*>.*?<\/script>/gs, '') // Remove script tags and content
    .replace(/<[^>]+>/g, ' ') // Replace other HTML tags with space
    // Then clean escaped characters and entities
    .replace(/\\r\\n|\\n|\\r/g, ' ') // Replace escaped newlines with space
    .replace(/\\t/g, ' ') // Replace escaped tabs
    .replace(/&[#\w\d]+;/g, ' ') // Replace all HTML entities including numeric ones
    .replace(/[^\x20-\x7E]/g, ' ') // Replace non-printable chars with space
    .replace(/[Ãâ€]/g, '') // Remove common encoding artifacts
    // Finally normalize whitespace
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Check if text contains any of the keywords
 */
function containsKeywords(text: string, keywords: string[]): boolean {
  const lowercaseText = text.toLowerCase();
  return keywords.some(keyword => lowercaseText.includes(keyword.toLowerCase()));
}

/**
 * Calls Hugging Face API to classify if an email is a vinyl receipt
 */
async function classifyEmail(subject: string, senderName: string, senderEmail: string, cleanedBody: string): Promise<EmailData['classification']> {
  try {
    // Clean and prepare input text
    const cleanedSubject = cleanText(subject);
    
    console.log('Starting classification for:', {
      subject: cleanedSubject,
      sender: senderEmail
    });
    
    // Look for vinyl-specific keywords in the text
    const vinylKeywords = ['vinyl', 'LP', 'EP', '12"', '7"', '10"', '45rpm', '33rpm'];
    const hasVinylKeywords = containsKeywords(cleanedSubject, vinylKeywords) || 
                            containsKeywords(cleanedBody, vinylKeywords);

    // Look for receipt/order keywords in subject
    const receiptKeywords = ['order', 'confirmed', 'confirmation', 'receipt', 'purchase', 'transaction'];
    const hasReceiptKeywords = containsKeywords(cleanedSubject, receiptKeywords);

    // Look for shipping keywords that indicate it's not a receipt
    const shippingKeywords = ['shipped', 'shipping', 'delivered', 'delivery', 'tracking'];
    const hasShippingKeywords = containsKeywords(cleanedSubject, shippingKeywords);
    
    console.log('Keyword detection results:', {
      sender: senderEmail,
      subject: cleanedSubject,
      hasVinylKeywords,
      hasReceiptKeywords,
      hasShippingKeywords
    });

    // Early return cases based on keywords
    if (hasShippingKeywords) {
      console.log('Early return: Shipping notification detected', {
        sender: senderEmail,
        subject: cleanedSubject
      });
      return {
        isReceipt: false,
        score: 1,
        explanation: 'Shipping notification detected from keywords'
      };
    }

    if (hasReceiptKeywords && hasVinylKeywords && !hasShippingKeywords) {
      console.log('Early return: Clear vinyl receipt detected', {
        sender: senderEmail,
        subject: cleanedSubject
      });
      return {
        isReceipt: true,
        score: 1,
        explanation: 'Vinyl purchase receipt detected from keywords'
      };
    }

    // Initialize Hugging Face client only if needed
    const hf = new HfInference(Deno.env.get('HUGGINGFACE_API_KEY'));

    let receiptScore = 0;
    let isReceipt = false;
    
    // Prepare input text with cleaned content
    const inputText = `From: ${senderName} <${senderEmail}>
Subject: ${cleanedSubject}
Preview: ${cleanedBody}`;

    // If we have receipt keywords but no vinyl keywords, or no keywords at all,
    // check if it's a receipt first
    if (!hasVinylKeywords || !hasReceiptKeywords) {
      console.log('Running receipt classification model', {
        sender: senderEmail,
        subject: cleanedSubject,
        reason: !hasVinylKeywords ? 'No vinyl keywords' : 'No receipt keywords'
      });

      const receiptResult = await hf.zeroShotClassification({
        model: 'facebook/bart-large-mnli',
        inputs: inputText,
        parameters: {
          candidate_labels: [
            'order confirmation email',
            'purchase receipt',
            'shipping notification',
            'other email'
          ]
        }
      });

      if (!Array.isArray(receiptResult) || !receiptResult[0]?.scores || !receiptResult[0]?.labels) {
        throw new Error('Invalid receipt classification response');
      }

      receiptScore = Math.max(
        ...receiptResult[0].scores.filter((_, i) => 
          receiptResult[0].labels[i].includes('receipt') || 
          receiptResult[0].labels[i].includes('order confirmation')
        )
      );

      // Boost receipt score if we have receipt keywords
      if (hasReceiptKeywords) {
        console.log('Boosting receipt score due to keywords', {
          sender: senderEmail,
          subject: cleanedSubject,
          originalScore: receiptScore,
          boostedScore: Math.max(receiptScore, 0.7)
        });
        receiptScore = Math.max(receiptScore, 0.7);
      }

      isReceipt = receiptScore > 0.5;

      // If it's not a receipt and we don't have vinyl keywords, return early
      if (!isReceipt && !hasVinylKeywords) {
        console.log('Early return: Not a receipt', {
          sender: senderEmail,
          subject: cleanedSubject,
          receiptScore
        });
        return {
          isReceipt: false,
          score: receiptScore,
          explanation: `Not a purchase receipt (${(receiptScore * 100).toFixed(1)}% confidence)`
        };
      }
    }

    // Skip music classification if we already have vinyl keywords
    if (hasVinylKeywords) {
      console.log('Skipping music classification due to vinyl keywords', {
        sender: senderEmail,
        subject: cleanedSubject,
        isReceipt,
        hasReceiptKeywords
      });
      return {
        isReceipt: isReceipt || hasReceiptKeywords,
        score: 0.8,
        explanation: `Vinyl purchase detected from keywords${hasReceiptKeywords ? ' with order confirmation' : ''}`
      };
    }

    console.log('Running music classification model', {
      sender: senderEmail,
      subject: cleanedSubject,
      receiptScore,
      isReceipt
    });

    // Check if it's music-related
    const musicResult = await hf.zeroShotClassification({
      model: 'facebook/bart-large-mnli',
      inputs: inputText,
      parameters: {
        candidate_labels: [
          'vinyl record or LP purchase',
          'music album or CD purchase',
          'other product purchase'
        ]
      }
    });

    if (!Array.isArray(musicResult) || !musicResult[0]?.scores || !musicResult[0]?.labels) {
      throw new Error('Invalid music classification response');
    }

    const topMusicLabel = musicResult[0].labels[0];
    const topMusicScore = musicResult[0].scores[0];
    
    const isMusicRelated = topMusicLabel.includes('vinyl') || 
                          topMusicLabel.includes('music');

    console.log('Final classification result:', {
      sender: senderEmail,
      subject: cleanedSubject,
      hasReceiptKeywords,
      hasVinylKeywords,
      hasShippingKeywords,
      receiptScore,
      musicScore: topMusicScore,
      musicLabel: topMusicLabel,
      isMusicRelated,
      finalDecision: isMusicRelated && (isReceipt || hasReceiptKeywords)
    });

    return {
      isReceipt: isMusicRelated && (isReceipt || hasReceiptKeywords),
      score: topMusicScore,
      explanation: isMusicRelated
        ? `Music purchase receipt (${(topMusicScore * 100).toFixed(1)}% confidence): ${topMusicLabel}`
        : `Non-music receipt (${(topMusicScore * 100).toFixed(1)}% confidence)`
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
      maxResults: 15
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
          let body = '';
          if (fullMessage.data.payload?.parts) {
            // Handle multipart message
            for (const part of fullMessage.data.payload.parts) {
              // Try to get plain text first
              if (part.mimeType === 'text/plain' && part.body?.data) {
                body = cleanText(atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/')));
                break;
              }
              // If no plain text, try HTML
              if (part.mimeType === 'text/html' && part.body?.data) {
                body = cleanText(atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/')));
                break;
              }
            }
          } else if (fullMessage.data.payload?.body?.data) {
            // Handle single part message
            body = cleanText(atob(fullMessage.data.payload.body.data.replace(/-/g, '+').replace(/_/g, '/')));
          }

          // Truncate body to reasonable length and ensure it's not empty
          const truncatedBody = body.substring(0, 1000) || '[No readable content]';

          // Classify the email
          console.log(`Classifying email: ${subject}`)
          const classification = await classifyEmail(subject, senderName, senderEmail, truncatedBody)

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