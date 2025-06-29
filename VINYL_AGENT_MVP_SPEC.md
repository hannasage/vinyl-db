# Vinyl Agent MVP Specification

## Project Overview
A progressive web application that allows users to manage their vinyl record collection through a chat interface. Users can send album names and artists to the agent, which can query their existing collection to confirm ownership and provide collection management assistance.

## Current Project Architecture
The project already has a solid foundation with:
- **Next.js 14** with App Router and TypeScript
- **Supabase** integration with existing database schema
- **Tailwind CSS** for styling
- **Existing database tables**: `album`, `artist`, `collection`, `entry`, `vibe`
- **Supabase Edge Functions** for API calls
- **Authentication** system using Supabase Auth
- **Existing components** for album display and filtering
- **Chat interface** with message system and image upload capabilities

## Core User Journey
1. User opens PWA at hosted URL
2. User logs in/authenticates (existing Supabase Auth)
3. User sends album name and artist in chat
4. Agent queries existing collection to check ownership
5. Agent responds with confirmation and collection details
6. User can manage their collection through the chat interface

## Technical Stack (Current + Additions)
- **Frontend**: Next.js 14 with App Router (existing)
- **Backend**: Next.js API routes + Supabase Edge Functions (existing)
- **Database**: Supabase PostgreSQL with existing schema
- **Authentication**: Supabase Auth (existing)
- **Storage**: Supabase Storage buckets (existing)
- **Edge Functions**: Supabase Edge Functions (existing)
- **Chat Interface**: React-based chat system with message history (existing)
- **Collection Querying**: Database queries through Supabase Edge Functions
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

**Prompt 1: Create image upload component** ✅
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

**Prompt 2: Integrate image upload into chat interface** ✅
"Add the image upload component to the chat interface. Position it next to the text input field with an upload button. Allow users to send both text and images in the same message."

**Acceptance Criteria:**
- Image upload button appears next to text input
- Users can select image and add text before sending
- Image preview shows in the input area before sending
- Send button is disabled when no content (text or image) is provided
- Upload button has proper loading states
- Interface remains responsive with image upload added

**Prompt 3: Update message types to support images** ✅
"Extend the chat message system to support image messages. Update TypeScript interfaces in `data/types.ts` to include image URLs and metadata. Update ChatMessage component to display images properly."

**Acceptance Criteria:**
- ChatMessage interface supports image type messages
- Image messages display properly in chat
- Images are responsive and fit within message bubbles
- Image metadata (filename, size) is stored
- Message types are properly typed in TypeScript
- ChatMessage component handles both text and image content

**Prompt 4: Create image upload endpoint** ✅
"Create a new Supabase Edge Function called `upload-image` that accepts image files, uploads them to Supabase Storage, and returns the public URL. Handle file validation and storage bucket configuration."

**Acceptance Criteria:**
- Edge Function exists at `supabase/functions/upload-image/index.ts`
- Accepts multipart form data with image files
- Validates file type and size before upload
- Uploads to existing 'artwork' storage bucket
- Returns public URL of uploaded image
- Handles upload errors gracefully
- Supports CORS for frontend requests

**Prompt 5: Connect image upload to backend** ✅
"Integrate the frontend image upload with the backend endpoint. Upload images to Supabase Storage before sending messages, and include image URLs in chat messages."

**Acceptance Criteria:**
- Images are uploaded to Supabase Storage before sending
- Image URLs are included in message data
- Loading states show during image upload
- Error handling for failed uploads
- Images are properly displayed in chat history
- Upload progress is shown to user

### Phase 3: Collection Query Agent ✅ COMPLETED

**Prompt 1: Create collection query endpoint** ✅
"Create a new Supabase Edge Function called `query-collection` that accepts album name and artist, then queries the user's collection to check if they own the album. Return detailed information about the album if found."

**Acceptance Criteria:**
- Edge Function exists at `supabase/functions/query-collection/index.ts`
- Accepts POST requests with album name and artist parameters
- Queries the existing database schema (album, artist, collection, entry tables)
- Returns structured JSON response with album details if found
- Returns appropriate response when album is not found
- Handles fuzzy matching for album/artist names
- Proper error handling for database queries
- CORS headers configured for frontend requests

**Prompt 2: Update chat response to handle collection queries** ✅
"Modify the existing `chat-response` Edge Function to parse user messages for album/artist information and call the collection query endpoint. Return helpful responses about collection status."

**Acceptance Criteria:**
- Chat response function parses incoming messages for album information
- Detects album name and artist from user input
- Calls collection query endpoint when album information is detected
- Returns formatted responses about collection status
- Handles cases where album information is unclear
- Provides helpful prompts when information is missing
- Maintains conversation context and flow

**Prompt 3: Add natural language processing for album detection** ✅
"Implement basic NLP to extract album names and artists from user messages. Handle various input formats like 'Do I have Dark Side of the Moon by Pink Floyd?' or 'Pink Floyd - Dark Side of the Moon'."

**Acceptance Criteria:**
- Function can extract album and artist from various message formats
- Handles common question patterns ("Do I have...", "Is...in my collection")
- Supports different separators (by, -, etc.)
- Handles partial matches and fuzzy search
- Returns structured data for album name and artist
- Graceful handling of unclear or incomplete information
- Provides helpful prompts for clarification when needed

**Prompt 4: Create collection status display component** ✅
"Build a `CollectionStatus.tsx` component that displays whether an album is in the user's collection, along with relevant details like condition, purchase date, and notes."

**Acceptance Criteria:**
- CollectionStatus component exists in `components/CollectionStatus.tsx`
- Displays clear status (Owned/Not Owned)
- Shows album artwork, title, artist, and release year
- Displays collection details like condition and purchase date
- Includes action buttons for collection management
- Responsive design matches chat interface
- Component is reusable and properly typed

**Prompt 5: Integrate collection status into chat flow** ✅
"Add the collection status component to the chat flow. Display collection information as part of agent responses when albums are queried."

**Acceptance Criteria:**
- Collection status appears in chat after album queries
- Status integrates seamlessly with existing message flow
- Users can see detailed collection information
- Clear visual distinction between owned and not owned albums
- Provides context for collection management decisions
- Maintains chat conversation flow and history

### Phase 4: CRUD Operations & Multi-Step Agent

**Prompt 1: Design multi-step agent execution framework**
"Enhance the chat-response endpoint to support multi-step agent execution. Allow the agent to plan and execute multiple tool calls in sequence for complex operations like batch album management."

**Acceptance Criteria:**
- Agent can plan multi-step operations using GPT
- Support for sequential tool execution
- Ability to handle arrays of albums/artists in single commands
- Progress tracking and status updates during execution
- Error handling that can rollback or continue partial operations
- Clear communication of multi-step progress to user

**Prompt 2: Create add album tool and endpoint**
"Create a new Supabase Edge Function called `add-album` that adds albums to the user's collection. Handle artist creation if needed and validate input data."

**Acceptance Criteria:**
- Edge Function exists at `supabase/functions/add-album/index.ts`
- Accepts album name, artist name, and optional metadata
- Creates artist record if it doesn't exist
- Creates album record with proper foreign key relationships
- Validates input data and handles duplicates
- Returns structured response with created album details
- Proper error handling and rollback on failures

**Prompt 3: Create remove album tool and endpoint**
"Create a new Supabase Edge Function called `remove-album` that removes albums from the user's collection. Handle cleanup of orphaned artists if needed."

**Acceptance Criteria:**
- Edge Function exists at `supabase/functions/remove-album/index.ts`
- Accepts album ID or album name + artist for identification
- Removes album record from database
- Cleans up orphaned artists (no remaining albums)
- Confirms deletion with user before proceeding
- Returns structured response with deletion status
- Proper error handling for non-existent albums

**Prompt 4: Update agent to handle batch operations**
"Enhance the agent's message parsing to detect batch operations like 'add these albums to my library' or 'do I have these albums?' and plan appropriate multi-step execution."

**Acceptance Criteria:**
- Agent can parse batch album lists from user messages
- Generates execution plans for multi-album operations
- Handles both batch queries and batch modifications
- Provides progress updates during batch operations
- Summarizes results of batch operations
- Graceful handling of partial failures in batch operations

**Prompt 5: Create album management interface components**
"Build components for album addition/removal confirmation and batch operation progress tracking. Integrate these into the chat flow."

**Acceptance Criteria:**
- AlbumAction component for add/remove confirmations
- BatchProgress component for multi-step operation tracking
- Integration with existing chat message system
- Clear visual feedback for pending actions
- Confirmation dialogs for destructive operations
- Progress indicators for long-running batch operations

### Phase 5: Enhanced Chat Experience (SAVED FOR LATER)

**Prompt 6: Add message timestamps and styling**
"Enhance the chat messages with timestamps, better styling, and message status indicators (sent, delivered, etc.). Add smooth animations for new messages appearing and improve the overall visual polish of the chat interface."

**Prompt 7: Implement typing indicators**
"Add a typing indicator that shows when the agent is 'thinking' (displayed while waiting for the API response). Create a subtle animation with dots or a typing indicator component that appears below the last message."

**Prompt 8: Add message persistence**
"Implement basic message persistence using localStorage so that chat history is maintained when the user refreshes the page. Add a function to clear chat history and handle storage limits."

**Prompt 9: Enhance input field functionality**
"Improve the chat input field with features like Enter key to send, Shift+Enter for new lines, character count, and input validation. Add a send button that's disabled when the input is empty."

### Phase 5: Chat Interface Polish (SAVED FOR LATER)

**Prompt 10: Add welcome message and instructions**
"Display a welcome message when the chat loads, explaining how to use the interface. Add helpful instructions and example messages that users can click to send."

**Prompt 11: Implement message actions**
"Add message actions like copy, delete (for user messages), and retry (for failed messages). Include right-click context menus or action buttons that appear on hover."

**Prompt 12: Add chat header and status**
"Create a chat header that shows the current session status, user information, and any relevant controls. Add a status indicator showing connection status to the backend."

**Prompt 13: Implement message search**
"Add a search functionality to find specific messages in the chat history. Include a search input in the header and highlight matching text in messages."

### Phase 6: Mobile Optimization (SAVED FOR LATER)

**Prompt 14: Optimize for mobile devices**
"Ensure the chat interface works seamlessly on mobile devices. Add touch-friendly interactions, responsive design, and mobile-specific UI improvements. Test on various screen sizes and add proper viewport handling."

**Prompt 15: Add mobile-specific features**
"Implement mobile-specific features like swipe gestures, pull-to-refresh, and better keyboard handling. Add a floating action button for quick actions on mobile."

### Phase 7: Testing and Documentation (SAVED FOR LATER)

**Prompt 16: Add comprehensive testing**
"Create unit tests for chat components, integration tests for the chat endpoint, and basic end-to-end tests for the chat flow. Set up testing framework and ensure good test coverage."

**Prompt 17: Document the chat system**
"Create documentation for the chat interface, including component usage, API endpoints, and user guide. Add comments to the code and create a README section for the chat functionality."

## Success Criteria
- Chat interface provides a natural, intuitive messaging experience
- Messages are properly displayed with clear visual distinction between user and agent
- Agent can parse user messages to extract album and artist information using AI
- Collection queries return accurate information about album ownership
- Agent provides helpful responses about collection status
- Interface works seamlessly on both desktop and mobile devices
- Chat history persists across page refreshes
- Error handling is robust and user-friendly with AI-powered error messages
- Performance is optimized for quick message display
- Image upload functionality works on both mobile and desktop
- Images are properly stored and displayed in chat
- File validation prevents invalid uploads
- Collection status is clearly displayed with relevant details
- Natural language processing accurately extracts album information from various input formats
- Agent supports flexible queries (artist only, album only, or both)
- Multi-step agent execution framework supports complex batch operations
- CRUD operations allow adding and removing albums from collection
- Batch operations handle multiple albums in single commands
- Progress tracking provides clear feedback during multi-step operations
- Album management interface provides confirmation and progress indicators
