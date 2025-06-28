# Vinyl Agent MVP Specification

## Project Overview
A progressive web application that allows users to manage their vinyl record collection through a chat interface. Users can photograph album covers, have them automatically recognized and populated, review the information, and add records to their personal database.

## Current Project Architecture
The project already has a solid foundation with:
- **Next.js 14** with App Router and TypeScript
- **Supabase** integration with existing database schema
- **Tailwind CSS** for styling
- **Existing database tables**: `album`, `artist`, `collection`, `entry`, `vibe`
- **Supabase Edge Functions** for API calls
- **Authentication** system using Supabase Auth
- **Existing components** for album display and filtering

## Core User Journey
1. User opens PWA at hosted URL
2. User logs in/authenticates (existing Supabase Auth)
3. User uploads photo of album cover
4. Agent recognizes album and fetches metadata
5. User reviews and approves information
6. Record is added to user's database using existing schema

## Technical Stack (Current + Additions)
- **Frontend**: Next.js 14 with App Router (existing)
- **Backend**: Next.js API routes + Supabase Edge Functions (existing)
- **Database**: Supabase PostgreSQL with existing schema
- **Authentication**: Supabase Auth (existing)
- **Storage**: Supabase Storage buckets (to be added)
- **Edge Functions**: Supabase Edge Functions (existing)
- **Image Recognition**: Integration with album cover recognition API
- **Album Metadata**: Integration with music database API (Discogs, MusicBrainz, etc.)
- **Deployment**: Vercel (recommended for Next.js)

## Implementation Prompts

### Phase 1: Chat Interface Foundation ✅ COMPLETED

**Prompt 1: Create chat interface layout** ✅
"Transform the admin page at `app/admin/manage/page.tsx` into a chat-based interface. Create a `components/ChatInterface.tsx` component with a message list area, input field, and send button. Style it with a modern, clean design using Tailwind CSS. The layout should be responsive and centered on the page."

**Acceptance Criteria:**
- Admin page at `/admin/manage` displays a chat interface instead of the current BrowseTheShelf component
- ChatInterface component exists in `components/ChatInterface.tsx`
- Interface has a message list area that takes up most of the screen
- Input field is positioned at the bottom with a send button
- Layout is responsive and works on desktop and mobile
- Uses Tailwind CSS for styling with a clean, modern design
- Component is properly exported and imported

**Prompt 2: Implement chat message system** ✅
"Create a chat message system with `components/ChatMessage.tsx` that can display different message types: user messages and agent responses. Include proper TypeScript interfaces for message types in `data/types.ts`. Style user messages on the right (blue background) and agent messages on the left (gray background)."

**Acceptance Criteria:**
- ChatMessage component exists in `components/ChatMessage.tsx`
- Message types are defined in `data/types.ts` with proper TypeScript interfaces
- User messages appear on the right with blue background
- Agent messages appear on the left with gray background
- Messages display text content properly
- Component accepts props for message type, content, and timestamp
- Messages have proper spacing and padding

**Prompt 3: Add chat state management** ✅
"Implement chat state management using React state. Track conversation history, current session, and pending actions. Create utility functions for adding messages and managing chat flow. Store messages in a messages array with timestamps and sender information."

**Acceptance Criteria:**
- Chat state is managed using React useState hook
- Messages array stores message objects with id, content, sender, timestamp, and type
- addMessage utility function exists and properly adds messages to state
- clearMessages function exists to reset chat history
- State persists during the session (not lost on component re-renders)
- Messages are displayed in chronological order
- Each message has a unique ID for proper React key handling

**Prompt 4: Create dummy chat endpoint** ✅
"Create a new Supabase Edge Function called `chat-response` that simply returns 'Hello, chat!' as a JSON response. Set up the function to handle POST requests and return the response in a consistent format that the frontend can parse."

**Acceptance Criteria:**
- Edge Function exists at `supabase/functions/chat-response/index.ts`
- Function handles POST requests properly
- Returns JSON response with format: `{ message: "Hello, chat!", timestamp: "2024-01-01T00:00:00Z" }`
- Function can be deployed and invoked from frontend
- Proper error handling for malformed requests
- Function is accessible via Supabase client

**Prompt 5: Connect frontend to chat endpoint** ✅
"Integrate the chat interface with the dummy endpoint. When a user sends a message, call the `chat-response` Edge Function and display the response in the chat. Add loading states while waiting for the response and handle any potential errors."

**Acceptance Criteria:**
- Send button triggers API call to chat-response endpoint
- Loading state is shown while waiting for response
- Response from endpoint is displayed as agent message
- Error handling shows user-friendly error messages
- API call uses proper Supabase client configuration
- Network errors are handled gracefully
- Loading indicator disappears after response or error

### Phase 2: Image Upload Integration ✅ COMPLETED

**Prompt 1: Create image upload component** ✅ COMPLETED
"Create an `ImageUpload.tsx` component that allows users to select images from their phone or computer. Include drag-and-drop functionality, file picker button, and image preview. Support common image formats (jpg, png, webp) with proper validation."

**Acceptance Criteria:**
- ImageUpload component exists in `components/ImageUpload.tsx`
- Supports drag-and-drop from desktop
- File picker button works on mobile and desktop
- Accepts jpg, png, webp formats
- Shows image preview after selection
- Validates file size (max 10MB) and type
- Displays error messages for invalid files
- Responsive design works on mobile and desktop

**Prompt 2: Integrate image upload into chat interface** ✅ COMPLETED
"Add the image upload component to the chat interface. Position it next to the text input field with an upload button. Allow users to send both text and images in the same message."

**Acceptance Criteria:**
- Image upload button appears next to text input
- Users can select image and add text before sending
- Image preview shows in the input area before sending
- Send button is disabled when no content (text or image) is provided
- Upload button has proper loading states
- Interface remains responsive with image upload added

**Prompt 3: Update message types to support images** ✅ COMPLETED
"Extend the chat message system to support image messages. Update TypeScript interfaces in `data/types.ts` to include image URLs and metadata. Update ChatMessage component to display images properly."

**Acceptance Criteria:**
- ChatMessage interface supports image type messages
- Image messages display properly in chat
- Images are responsive and fit within message bubbles
- Image metadata (filename, size) is stored
- Message types are properly typed in TypeScript
- ChatMessage component handles both text and image content

**Prompt 4: Create image upload endpoint** ✅ COMPLETED
"Create a new Supabase Edge Function called `upload-image` that accepts image files, uploads them to Supabase Storage, and returns the public URL. Handle file validation and storage bucket configuration."

**Acceptance Criteria:**
- Edge Function exists at `supabase/functions/upload-image/index.ts`
- Accepts multipart form data with image files
- Validates file type and size before upload
- Uploads to existing 'artwork' storage bucket
- Returns public URL of uploaded image
- Handles upload errors gracefully
- Supports CORS for frontend requests

**Prompt 5: Connect image upload to backend** ✅ COMPLETED
"Integrate the frontend image upload with the backend endpoint. Upload images to Supabase Storage before sending messages, and include image URLs in chat messages."

**Acceptance Criteria:**
- Images are uploaded to Supabase Storage before sending
- Image URLs are included in message data
- Loading states show during image upload
- Error handling for failed uploads
- Images are properly displayed in chat history
- Upload progress is shown to user

### Phase 3: Enhanced Chat Experience (SAVED FOR LATER)

**Prompt 6: Add message timestamps and styling**
"Enhance the chat messages with timestamps, better styling, and message status indicators (sent, delivered, etc.). Add smooth animations for new messages appearing and improve the overall visual polish of the chat interface."

**Prompt 7: Implement typing indicators**
"Add a typing indicator that shows when the agent is 'thinking' (displayed while waiting for the API response). Create a subtle animation with dots or a typing indicator component that appears below the last message."

**Prompt 8: Add message persistence**
"Implement basic message persistence using localStorage so that chat history is maintained when the user refreshes the page. Add a function to clear chat history and handle storage limits."

**Prompt 9: Enhance input field functionality**
"Improve the chat input field with features like Enter key to send, Shift+Enter for new lines, character count, and input validation. Add a send button that's disabled when the input is empty."

### Phase 4: Chat Interface Polish (SAVED FOR LATER)

**Prompt 10: Add welcome message and instructions**
"Display a welcome message when the chat loads, explaining how to use the interface. Add helpful instructions and example messages that users can click to send."

**Prompt 11: Implement message actions**
"Add message actions like copy, delete (for user messages), and retry (for failed messages). Include right-click context menus or action buttons that appear on hover."

**Prompt 12: Add chat header and status**
"Create a chat header that shows the current session status, user information, and any relevant controls. Add a status indicator showing connection status to the backend."

**Prompt 13: Implement message search**
"Add a search functionality to find specific messages in the chat history. Include a search input in the header and highlight matching text in messages."

### Phase 5: Mobile Optimization (SAVED FOR LATER)

**Prompt 14: Optimize for mobile devices**
"Ensure the chat interface works seamlessly on mobile devices. Add touch-friendly interactions, responsive design, and mobile-specific UI improvements. Test on various screen sizes and add proper viewport handling."

**Prompt 15: Add mobile-specific features**
"Implement mobile-specific features like swipe gestures, pull-to-refresh, and better keyboard handling. Add a floating action button for quick actions on mobile."

### Phase 6: Testing and Documentation (SAVED FOR LATER)

**Prompt 16: Add comprehensive testing**
"Create unit tests for chat components, integration tests for the chat endpoint, and basic end-to-end tests for the chat flow. Set up testing framework and ensure good test coverage."

**Prompt 17: Document the chat system**
"Create documentation for the chat interface, including component usage, API endpoints, and user guide. Add comments to the code and create a README section for the chat functionality."

## Success Criteria
- Chat interface provides a natural, intuitive messaging experience
- Messages are properly displayed with clear visual distinction between user and agent
- Dummy endpoint successfully returns responses to user messages
- Interface works seamlessly on both desktop and mobile devices
- Chat history persists across page refreshes
- Error handling is robust and user-friendly
- Performance is optimized for quick message display
- Image upload functionality works on both mobile and desktop
- Images are properly stored and displayed in chat
- File validation prevents invalid uploads
