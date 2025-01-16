import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { google } from 'npm:googleapis@144.0.0';
import { processEmails } from './email-agent';

// Initialize Gmail API client
const gmail = google.gmail({ 
  version: 'v1', 
  auth: new google.auth.JWT({
    email: Deno.env.get('GMAIL_CLIENT_EMAIL'),
    key: Deno.env.get('GMAIL_PRIVATE_KEY'),
    scopes: ['https://www.googleapis.com/auth/gmail.readonly']
  })
});

console.log("Hello from Functions!")

Deno.serve(async (req) => {
  try {
    // Get emails from the last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: `from:${Deno.env.get('TARGET_EMAIL_ADDRESS')} after:${yesterday.getTime()}`
    });

    if (!response.data.messages || response.data.messages.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No new emails found' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch full email content for each message
    const emailPromises = response.data.messages.map(async (message) => {
      const fullEmail = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full'
      });
      
      return {
        id: fullEmail.data.id,
        threadId: fullEmail.data.threadId,
        snippet: fullEmail.data.snippet,
        payload: fullEmail.data.payload,
        labelIds: fullEmail.data.labelIds,
        internalDate: fullEmail.data.internalDate
      };
    });

    const emails = await Promise.all(emailPromises);
    
    // Process each email through the email agent
    const processingResults = await Promise.all(
      emails.map(email => processEmails(email))
    );

    return new Response(
      JSON.stringify({
        message: 'Emails processed successfully',
        processed: processingResults
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing emails:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process emails',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
});

/* To invoke locally:

1. Set up environment variables in your .env file:
   GMAIL_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   GMAIL_PRIVATE_KEY=your-private-key
   TARGET_EMAIL_ADDRESS=specific-email@example.com
   LANGCHAIN_API_KEY=your-langsmith-key
   ANTHROPIC_API_KEY=your-anthropic-key
   SUPABASE_URL=your-supabase-url
   SUPABASE_ANON_KEY=your-supabase-anon-key

2. Run `supabase start`

3. Make an HTTP request:
   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/intake-agent' \
     --header 'Authorization: Bearer your-supabase-anon-key'

*/
