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

### Phase 1: Chat Interface Foundation

**Prompt 1: Create chat interface layout**
"Transform the admin page at `app/admin/manage/page.tsx` into a chat-based interface. Create a `components/ChatInterface.tsx` component with a message list area, input field, and send button. Style it with a modern, clean design using Tailwind CSS. The layout should be responsive and centered on the page."

**Acceptance Criteria:**
- Admin page at `/admin/manage` displays a chat interface instead of the current BrowseTheShelf component
- ChatInterface component exists in `components/ChatInterface.tsx`
- Interface has a message list area that takes up most of the screen
- Input field is positioned at the bottom with a send button
- Layout is responsive and works on desktop and mobile
- Uses Tailwind CSS for styling with a clean, modern design
- Component is properly exported and imported

**Prompt 2: Implement chat message system**
"Create a chat message system with `components/ChatMessage.tsx` that can display different message types: user messages and agent responses. Include proper TypeScript interfaces for message types in `data/types.ts`. Style user messages on the right (blue background) and agent messages on the left (gray background)."

**Acceptance Criteria:**
- ChatMessage component exists in `components/ChatMessage.tsx`
- Message types are defined in `data/types.ts` with proper TypeScript interfaces
- User messages appear on the right with blue background
- Agent messages appear on the left with gray background
- Messages display text content properly
- Component accepts props for message type, content, and timestamp
- Messages have proper spacing and padding

**Prompt 3: Add chat state management**
"Implement chat state management using React state. Track conversation history, current session, and pending actions. Create utility functions for adding messages and managing chat flow. Store messages in a messages array with timestamps and sender information."

**Acceptance Criteria:**
- Chat state is managed using React useState hook
- Messages array stores message objects with id, content, sender, timestamp, and type
- addMessage utility function exists and properly adds messages to state
- clearMessages function exists to reset chat history
- State persists during the session (not lost on component re-renders)
- Messages are displayed in chronological order
- Each message has a unique ID for proper React key handling

**Prompt 4: Create dummy chat endpoint**
"Create a new Supabase Edge Function called `chat-response` that simply returns 'Hello, chat!' as a JSON response. Set up the function to handle POST requests and return the response in a consistent format that the frontend can parse."

**Acceptance Criteria:**
- Edge Function exists at `supabase/functions/chat-response/index.ts`
- Function handles POST requests properly
- Returns JSON response with format: `{ message: "Hello, chat!", timestamp: "2024-01-01T00:00:00Z" }`
- Function can be deployed and invoked from frontend
- Proper error handling for malformed requests
- Function is accessible via Supabase client

**Prompt 5: Connect frontend to chat endpoint**
"Integrate the chat interface with the dummy endpoint. When a user sends a message, call the `chat-response` Edge Function and display the response in the chat. Add loading states while waiting for the response and handle any potential errors."

**Acceptance Criteria:**
- Send button triggers API call to chat-response endpoint
- Loading state is shown while waiting for response
- Response from endpoint is displayed as agent message
- Error handling shows user-friendly error messages
- API call uses proper Supabase client configuration
- Network errors are handled gracefully
- Loading indicator disappears after response or error

### Phase 2: Enhanced Chat Experience

**Prompt 6: Add message timestamps and styling**
"Enhance the chat messages with timestamps, better styling, and message status indicators (sent, delivered, etc.). Add smooth animations for new messages appearing and improve the overall visual polish of the chat interface."

**Acceptance Criteria:**
- Each message displays a timestamp in readable format (e.g., "2:30 PM")
- Messages have smooth fade-in animation when appearing
- User messages show "sent" status indicator
- Agent messages show "delivered" status indicator
- Improved visual styling with better shadows and spacing
- Messages have proper border radius and padding
- Timestamps are styled consistently and positioned correctly

**Prompt 7: Implement typing indicators**
"Add a typing indicator that shows when the agent is 'thinking' (displayed while waiting for the API response). Create a subtle animation with dots or a typing indicator component that appears below the last message."

**Acceptance Criteria:**
- TypingIndicator component exists in `components/TypingIndicator.tsx`
- Shows animated dots or typing animation
- Appears when API call is in progress
- Disappears when response is received
- Positioned below the last message in the chat
- Animation is smooth and not jarring
- Component is reusable and properly styled

**Prompt 8: Add message persistence**
"Implement basic message persistence using localStorage so that chat history is maintained when the user refreshes the page. Add a function to clear chat history and handle storage limits."

**Acceptance Criteria:**
- Messages are saved to localStorage on each new message
- Chat history loads from localStorage on page refresh
- clearChatHistory function removes all messages from state and localStorage
- Storage limit handling prevents localStorage overflow
- Messages persist across browser sessions
- Clear chat button exists and functions properly
- Storage operations don't block the UI

**Prompt 9: Enhance input field functionality**
"Improve the chat input field with features like Enter key to send, Shift+Enter for new lines, character count, and input validation. Add a send button that's disabled when the input is empty."

**Acceptance Criteria:**
- Enter key sends message
- Shift+Enter creates new line in input
- Character count is displayed (e.g., "0/500")
- Send button is disabled when input is empty
- Input validation prevents empty messages
- Maximum character limit is enforced
- Input field auto-focuses when chat loads
- Input field clears after sending message

### Phase 3: Chat Interface Polish

**Prompt 10: Add welcome message and instructions**
"Display a welcome message when the chat loads, explaining how to use the interface. Add helpful instructions and example messages that users can click to send."

**Acceptance Criteria:**
- Welcome message appears when chat first loads
- Message explains how to use the chat interface
- Example messages are clickable and send when clicked
- Welcome message only shows on first visit or when chat is empty
- Instructions are clear and helpful
- Example messages are relevant to the vinyl collection context
- Welcome message is styled differently from regular messages

**Prompt 11: Implement message actions**
"Add message actions like copy, delete (for user messages), and retry (for failed messages). Include right-click context menus or action buttons that appear on hover."

**Acceptance Criteria:**
- Message actions appear on hover or right-click
- Copy action copies message text to clipboard
- Delete action removes user messages from chat
- Retry action re-sends failed API calls
- Actions are properly positioned relative to messages
- Context menu or action buttons are styled consistently
- Actions work on both desktop and mobile
- Failed messages are visually distinct

**Prompt 12: Add chat header and status**
"Create a chat header that shows the current session status, user information, and any relevant controls. Add a status indicator showing connection status to the backend."

**Acceptance Criteria:**
- ChatHeader component exists in `components/ChatHeader.tsx`
- Header shows current session status
- Connection status indicator shows online/offline
- User information is displayed if available
- Clear chat button is in header
- Header is positioned at top of chat interface
- Status indicators are visually clear
- Header is responsive and works on mobile

**Prompt 13: Implement message search**
"Add a search functionality to find specific messages in the chat history. Include a search input in the header and highlight matching text in messages."

**Acceptance Criteria:**
- Search input exists in chat header
- Search filters messages in real-time as user types
- Matching text is highlighted in messages
- Search is case-insensitive
- Search results show message count
- Clear search button resets search
- Search works across both user and agent messages
- No results state is handled gracefully

### Phase 4: Mobile Optimization

**Prompt 14: Optimize for mobile devices**
"Ensure the chat interface works seamlessly on mobile devices. Add touch-friendly interactions, responsive design, and mobile-specific UI improvements. Test on various screen sizes and add proper viewport handling."

**Acceptance Criteria:**
- Chat interface is fully responsive on mobile devices
- Touch targets are at least 44px for accessibility
- Input field works properly with mobile keyboards
- Messages are readable on small screens
- Send button is easily tappable
- No horizontal scrolling on mobile
- Viewport meta tag is properly configured
- Interface works on iOS and Android browsers

**Prompt 15: Add mobile-specific features**
"Implement mobile-specific features like swipe gestures, pull-to-refresh, and better keyboard handling. Add a floating action button for quick actions on mobile."

**Acceptance Criteria:**
- Pull-to-refresh reloads chat history
- Swipe gestures work for message actions
- Floating action button appears on mobile
- Keyboard handling doesn't break layout
- Mobile-specific touch feedback is implemented
- Gestures work on both iOS and Android
- Performance is smooth on mobile devices
- Mobile features don't interfere with desktop experience

### Phase 5: Testing and Documentation

**Prompt 16: Add comprehensive testing**
"Create unit tests for chat components, integration tests for the chat endpoint, and basic end-to-end tests for the chat flow. Set up testing framework and ensure good test coverage."

**Acceptance Criteria:**
- Unit tests exist for ChatInterface, ChatMessage, and TypingIndicator components
- Integration tests verify chat endpoint functionality
- End-to-end tests cover complete user flow
- Test coverage is above 80% for chat components
- Tests run successfully in CI/CD pipeline
- Error scenarios are properly tested
- Mobile responsiveness is tested
- Performance tests verify smooth operation

**Prompt 17: Document the chat system**
"Create documentation for the chat interface, including component usage, API endpoints, and user guide. Add comments to the code and create a README section for the chat functionality."

**Acceptance Criteria:**
- README section documents chat functionality
- Component props are documented with TypeScript
- API endpoint documentation includes request/response formats
- User guide explains how to use the chat interface
- Code comments explain complex logic
- Setup instructions are clear and complete
- Troubleshooting section covers common issues
- Documentation is up-to-date with current implementation

## Success Criteria
- Chat interface provides a natural, intuitive messaging experience
- Messages are properly displayed with clear visual distinction between user and agent
- Dummy endpoint successfully returns responses to user messages
- Interface works seamlessly on both desktop and mobile devices
- Chat history persists across page refreshes
- Error handling is robust and user-friendly
- Performance is optimized for quick message display
