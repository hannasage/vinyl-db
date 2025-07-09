# Vinyl Collection Agent v1.1 Specification

## Overview

Building on the successful chat-based vinyl collection management system in v1.0, v1.1 introduces three major enhancements:

1. **Long-term Memory and Chat History** - Persistent conversation storage and retrieval
2. **User Feedback System** - Ability for users to highlight exceptional conversations
3. **Dynamic Few-Shot Prompting** - Using exemplar conversations to improve AI responses

## 1. Long-term Memory and Chat History

### 1.1 Database Schema Extensions

#### New Tables

**conversation_sessions Table:**
- `id`: UUID primary key for session identification
- `user_id`: Foreign key to auth.users table with cascade delete
- `title`: Optional title for the conversation session
- `created_at`: Timestamp when session was created
- `updated_at`: Timestamp when session was last updated
- `message_count`: Integer count of messages in the session
- `is_active`: Boolean flag indicating if session is active

**conversation_messages Table:**
- `id`: UUID primary key for message identification
- `session_id`: Foreign key to conversation_sessions table with cascade delete
- `content`: Text content of the message (required)
- `sender`: Text field with check constraint ('user' or 'agent')
- `message_type`: Text field for message type (default: 'text')
- `timestamp`: Timestamp when message was created
- `metadata`: JSONB field for additional message metadata
- `sequence_number`: Integer for message ordering within session

**conversation_embeddings Table:**
- `id`: UUID primary key for embedding identification
- `session_id`: Foreign key to conversation_sessions table with cascade delete
- `embedding`: Vector field (1536 dimensions) for OpenAI embeddings
- `created_at`: Timestamp when embedding was created

**Database Indexes:**
- Vector similarity index on conversation_embeddings for efficient semantic search
- Standard indexes on foreign keys and frequently queried fields

#### RLS Policies

**conversation_sessions Policies:**
- **SELECT Policy**: Users can only view their own conversation sessions
- **INSERT Policy**: Users can only create sessions for themselves
- **UPDATE Policy**: Users can only update their own sessions

**conversation_messages Policies:**
- **SELECT Policy**: Users can only view messages from their own sessions
- **INSERT Policy**: Users can only add messages to their own sessions
- **UPDATE Policy**: Users can only update messages in their own sessions

**conversation_embeddings Policies:**
- **SELECT Policy**: Users can only access embeddings from their own sessions
- **INSERT Policy**: Users can only create embeddings for their own sessions
- **UPDATE Policy**: Users can only update embeddings for their own sessions

**Security Implementation:**
- All policies use `auth.uid()` to ensure user isolation
- Cascade deletes ensure data consistency when sessions are removed
- Foreign key relationships maintain referential integrity

### 1.2 Memory Management System

#### Enhanced Memory Manager (`utils/agent/memory.ts`)

**Data Interfaces:**

**ConversationSession Interface:**
- `id`: Unique session identifier
- `title`: Human-readable session title
- `createdAt`: Session creation timestamp
- `updatedAt`: Last update timestamp
- `messageCount`: Number of messages in session
- `isActive`: Whether session is currently active

**ConversationMessage Interface:**
- `id`: Unique message identifier
- `sessionId`: Reference to parent session
- `content`: Message text content
- `sender`: Message sender ('user' or 'agent')
- `messageType`: Type of message (text, image, etc.)
- `timestamp`: Message creation timestamp
- `metadata`: Optional additional message data
- `sequenceNumber`: Message order within session

**EnhancedMemoryManager Class:**

**Short-term Memory Functions:**
- `addShortTermMessage()`: Add message to current session memory
- `getShortTermContext()`: Get recent conversation context for AI prompts
- `clearShortTermMemory()`: Reset current session memory

**Long-term Memory Functions:**
- `createSession()`: Create new conversation session with optional title
- `saveMessage()`: Persist message to database
- `getSessionMessages()`: Retrieve messages from specific session
- `searchSimilarConversations()`: Find similar conversations using semantic search
- `getRecentSessions()`: Get user's recent conversation sessions
- `updateSessionTitle()`: Update session title
- `archiveSession()`: Mark session as inactive

**Memory Management Strategy:**
- Maintain short-term memory for current conversation context
- Persist conversations to database for long-term storage
- Use vector embeddings for semantic conversation search
- Support session management and archiving

### 1.3 UI Components

#### Conversation History Sidebar (`components/ConversationHistory.tsx`)

**Component Interface:**
- `onSessionSelect`: Callback when user selects a conversation session
- `onNewSession`: Callback to create a new conversation session
- `currentSessionId`: Currently active session identifier

**Features:**
- Display list of recent conversations with titles
- Search conversations by content using semantic search
- Create new conversation button
- Archive old conversations
- Auto-generate titles based on first few messages
- Session metadata display (message count, last activity)
- Responsive design for mobile and desktop

#### Session Management (`components/SessionManager.tsx`)

**Component Interface:**
- `sessionId`: Current session identifier
- `onTitleChange`: Callback when user changes session title
- `onArchive`: Callback to archive the current session

**Features:**
- Edit conversation title with inline editing
- Archive conversation (mark as inactive)
- Export conversation to various formats (text, JSON)
- Share conversation functionality (future feature)
- Session statistics display (message count, duration)
- Session metadata management

## 2. User Feedback System

### 2.1 Database Schema

**conversation_feedback Table:**
- `id`: UUID primary key for feedback identification
- `session_id`: Foreign key to conversation_sessions table with cascade delete
- `user_id`: Foreign key to auth.users table with cascade delete
- `feedback_type`: Text field with check constraint ('thumbs_up' or 'thumbs_down')
- `created_at`: Timestamp when feedback was provided

**exemplar_conversations Table:**
- `id`: UUID primary key for exemplar identification
- `session_id`: Foreign key to conversation_sessions table with cascade delete
- `user_id`: Foreign key to auth.users table with cascade delete
- `exemplar_type`: Text field with check constraint ('positive' or 'negative') - required
- `title`: Text title for the exemplar conversation - required
- `description`: Optional text description of the exemplar
- `tags`: Array of text tags for categorization
- `created_at`: Timestamp when exemplar was created
- `usage_count`: Integer count of how often exemplar has been used
- `last_used`: Timestamp when exemplar was last used in prompts
- `is_active`: Boolean flag indicating if exemplar is active

**Data Relationships:**
- Feedback is linked to specific conversation sessions
- Exemplars are created from feedback-marked conversations
- Cascade deletes ensure data consistency
- User isolation maintained through foreign key relationships

### 2.2 Feedback Components

#### Conversation Feedback (`components/ConversationFeedback.tsx`)

**Component Interface:**
- `sessionId`: Current conversation session identifier
- `onFeedbackSubmit`: Callback when user provides feedback
- `currentFeedback`: Currently selected feedback type (if any)

**Features:**
- Simple thumbs up/down feedback buttons
- Visual feedback indicators in chat UI
- Toggle functionality (user can change feedback)
- Automatic exemplar creation based on feedback
- Feedback persistence across sessions
- Clear visual states for feedback status

#### Exemplar Management (`components/ExemplarManager.tsx`)

**Component Interface:**
- `exemplars`: Array of exemplar conversations to display
- `onExemplarSelect`: Callback when user selects an exemplar
- `onExemplarEdit`: Callback when user edits exemplar metadata
- `onExemplarDelete`: Callback when user deletes an exemplar

**Features:**
- Display all exemplar conversations (positive and negative)
- Edit exemplar metadata (title, description, tags)
- Delete exemplars with confirmation
- Search and filter exemplars by type (positive/negative)
- View usage statistics for each exemplar
- Bulk operations for exemplar management
- Exemplar quality indicators

### 2.3 Feedback Integration

#### Chat UI Integration

- Thumbs up/down buttons available in chat interface
- Visual feedback indicators for marked conversations
- Ability to toggle feedback (change from thumbs up to thumbs down or vice versa)
- Automatic exemplar creation based on feedback (positive exemplars for thumbs up, negative exemplars for thumbs down)

#### Exemplar Types

- **Positive Exemplars**: Conversations marked with thumbs up - demonstrate good practices
- **Negative Exemplars**: Conversations marked with thumbs down - demonstrate what to avoid
- Both types are used in dynamic few-shot prompting to guide the AI's behavior

## 3. Enhanced Album Artwork Search

### 3.1 Improved Search Capabilities

#### Enhanced Tavily Search with Album Cover Focus

**Enhanced Artwork Searcher Class**

The system will implement an `EnhancedArtworkSearcher` class that provides two main functions:

1. **Initial Search** (`searchAlbumArtwork`):
   - Generates album cover-focused search terms
   - Uses Tavily with enhanced filtering
   - Returns up to 20 initial results
   - Filters out non-album cover images
   - Sorts by relevance and quality

2. **Additional Search** (`searchMoreArtwork`):
   - Generates alternative search terms to find different results
   - Searches with new terms to avoid duplicates
   - Combines with existing results
   - Removes duplicates
   - Returns additional 10 results

**Search Term Generation**

The system will generate two sets of search terms:

**Primary Album Cover Terms:**
- `{albumName} {artistName} album cover`
- `{albumName} {artistName} vinyl cover`
- `{albumName} {artistName} LP cover`
- `{albumName} {artistName} record cover`
- `{albumName} {artistName} CD cover`
- `{albumName} {artistName} official album artwork`
- `{albumName} {artistName} album sleeve`
- `{albumName} {artistName} vinyl sleeve`

**Alternative Search Terms:**
- `{albumName} {artistName} album art`
- `{albumName} {artistName} cover art`
- `{albumName} {artistName} music album`
- `{albumName} {artistName} record album`
- `{albumName} {artistName} vinyl record`
- `{albumName} {artistName} LP vinyl`
- `{albumName} {artistName} album jacket`
- `{albumName} {artistName} music cover`

**Filtering Logic**

The system will filter out images containing these excluded terms:
- concert, live, performance, stage, tour, promo
- photoshoot, portrait, interview, backstage, studio
- music video, video, youtube, instagram, twitter

**Aspect Ratio Filtering:**
- Prefer square-ish images (aspect ratio close to 1:1)
- Accept images with aspect ratio within 0.8-1.2 range

**Duplicate Removal:**
- Compare URLs to remove duplicate images
- Case-insensitive URL comparison

#### Data Structures

**ArtworkSearchOptions Interface:**
- `maxResults`: Maximum number of results to return (default: 20)
- `minQuality`: Minimum quality threshold for images
- `preferSquare`: Whether to prefer square aspect ratio images

**ArtworkSearchResult Interface:**
- `url`: Image URL
- `title`: Image title or description
- `description`: Additional image description
- `width`: Image width in pixels
- `height`: Image height in pixels
- `source`: Source of the image (Tavily)
- `quality`: Quality score (0-1)
- `isAlbumCover`: Whether the image is identified as an album cover

### 3.2 UI Enhancements

#### Enhanced Artwork Selector (`components/EnhancedArtworkSelector.tsx`)

**Component Interface:**
- `albumName`: Name of the album
- `artistName`: Name of the artist
- `onArtworkSelect`: Callback when user selects an artwork
- `onSearchMore`: Callback to fetch additional artwork options
- `currentArtwork`: Currently selected artwork URL

**Features:**
- Display initial 6 results from enhanced Tavily search
- "Search More" button to fetch additional 10 results
- Filter options (album covers only, all images)
- Quality indicators and aspect ratio warnings
- Preview modal for larger image viewing
- Loading states for search operations

#### Search More Dialog (`components/SearchMoreDialog.tsx`)

**Component Interface:**
- `albumName`: Name of the album
- `artistName`: Name of the artist
- `onArtworkSelect`: Callback when user selects an artwork
- `onClose`: Callback to close the dialog
- `isOpen`: Whether the dialog is open

**Features:**
- Expanded search results (up to 20 total images)
- Advanced filtering options
- Manual search term input for custom searches
- Save search preferences for future use
- Grid layout for better image browsing

### 3.3 Tavily Integration

#### Enhanced Tavily Search Function

The system will enhance the existing Tavily integration with:

**Improved Search Parameters:**
- Use album cover-focused search terms
- Request higher quality images
- Filter for image results only
- Set appropriate result limits

**Search Term Optimization:**
- Generate multiple search term variations
- Use album-specific terminology (vinyl, LP, record, etc.)
- Include artist name for better accuracy
- Avoid generic music terms that return non-album images

**Result Processing:**
- Filter results based on URL patterns
- Check image dimensions for aspect ratio
- Remove duplicate images
- Sort by relevance and quality

## 4. Dynamic Few-Shot Prompting

#### Semantic Search for Relevant Exemplars

**ExemplarSelector Class**

The system will implement an `ExemplarSelector` class that provides two main functions:

1. **General Exemplar Search** (`findRelevantExemplars`):
   - Generate embedding for current query + conversation context
   - Search for similar exemplars using vector similarity
   - Filter by relevance and recency
   - Return top exemplars with usage tracking
   - Default limit of 3 exemplars

2. **Typed Exemplar Search** (`findRelevantExemplarsByType`):
   - Similar to general search but filters by exemplar type (positive/negative)
   - Useful for finding specific examples of good or bad practices
   - Default limit of 2 exemplars per type
   - Returns exemplars that demonstrate what to do or what to avoid

**Search Process:**
1. **Embedding Generation**: Convert current query and context to vector embedding
2. **Vector Similarity Search**: Find exemplars with similar embeddings
3. **Relevance Filtering**: Filter results based on semantic relevance
4. **Usage Tracking**: Track which exemplars are used for future optimization

### 3.2 Dynamic Prompt Construction

#### Enhanced Planning Function

**planOperationsWithExemplars Function**

The system will implement an enhanced planning function that incorporates exemplar conversations:

**Function Parameters:**
- `message`: Current user message
- `conversationContext`: Current conversation context
- `previousResults`: Results from previous operations
- `exemplars`: Array of relevant exemplar conversations

**Prompt Construction Process:**
1. **Exemplar Section Building**: Generate exemplar section from relevant conversations
2. **Dynamic Prompt Assembly**: Combine exemplars with static examples and context
3. **Type-Specific Instructions**: Include different instructions for positive vs negative exemplars

**System Prompt Structure:**
- Role and task definition
- Output format requirements
- Rules and constraints
- Available tools
- Planning patterns
- **Exemplar Conversations** (dynamically inserted)
- Static examples
- Conversation context
- Previous results
- Current request
- Reflection analysis (if applicable)

**Exemplar Section Format:**
Each exemplar will be formatted as:
- **Positive/Negative Exemplar**: [Title]
- Description: [Optional description]
- Tags: [Comma-separated tags]
- Conversation: [Full conversation transcript]
- Instruction: [Positive: "Use as reference" / Negative: "Avoid these patterns"]

**Integration with Existing System:**
- Replace static examples with dynamic exemplars when available
- Fall back to static examples when no relevant exemplars exist
- Maintain existing prompt structure and format

### 3.3 Exemplar Quality Management

#### Automatic Exemplar Evaluation

**ExemplarQualityManager Class**

The system will implement an `ExemplarQualityManager` class for maintaining exemplar quality:

**Quality Evaluation Function** (`evaluateExemplarQuality`):
- **Usage Count**: Track how often exemplar is used in prompts
- **Conversation Length**: Number of messages in the exemplar
- **Recency**: How old the exemplar is (days since creation)
- **Exemplar Type**: Positive or negative exemplar

**Quality Score Calculation:**
- Simple scoring based on usage frequency and recency
- Higher scores for frequently used, recent exemplars
- Lower scores for rarely used or very old exemplars

**Quality Metrics:**
- `usageCount`: Number of times exemplar has been used
- `conversationLength`: Number of messages in conversation
- `recency`: Days since exemplar creation
- `exemplarType`: Positive or negative classification

**Pruning Function** (`pruneLowQualityExemplars`):
- **Low Usage Threshold**: Deactivate exemplars with score < 0.3
- **Age Threshold**: Deactivate exemplars older than 365 days
- **Automatic Cleanup**: Run periodically to maintain exemplar quality
- **Safe Deactivation**: Mark as inactive rather than delete

**Recommendations System:**
- Generate recommendations based on quality metrics
- Suggest exemplar improvements or replacements
- Identify patterns in high-quality vs low-quality exemplars

## 4. Implementation Plan

### Phase 1: Database and Core Infrastructure (Week 1-2)
- [ ] Create new database tables and migrations
- [ ] Implement RLS policies
- [ ] Create enhanced memory manager
- [ ] Add conversation session management

### Phase 2: Long-term Memory (Week 3-4)
- [ ] Implement conversation persistence
- [ ] Add conversation history UI components
- [ ] Integrate with existing chat interface
- [ ] Add session management features

### Phase 3: Feedback System (Week 5-6)
- [ ] Implement thumbs up/down feedback components
- [ ] Add exemplar marking functionality (positive/negative)
- [ ] Integrate feedback into chat UI
- [ ] Create exemplar management interface

### Phase 4: Enhanced Album Artwork Search (Week 7-8)
- [ ] Implement enhanced Tavily artwork search with album cover focus
- [ ] Create enhanced artwork selector UI with "Search More" button
- [ ] Add filtering and duplicate removal logic
- [ ] Implement alternative search terms for additional results

### Phase 5: Dynamic Few-Shot Prompting (Week 9-10)
- [ ] Implement exemplar selection system
- [ ] Add semantic search capabilities
- [ ] Integrate dynamic prompting into chat response
- [ ] Add exemplar quality management

### Phase 6: Testing and Optimization (Week 11-12)
- [ ] Comprehensive testing of all features
- [ ] Performance optimization
- [ ] User experience refinement
- [ ] Documentation and deployment

## 5. Technical Considerations

### 5.1 Performance
- Implement caching for frequently accessed exemplars
- Use database indexing for efficient conversation search
- Optimize embedding generation and storage
- Implement pagination for conversation history
- Cache Tavily artwork search results to reduce API calls
- Optimize image loading and display performance

### 5.2 Scalability
- Consider vector database migration for large-scale exemplar storage
- Implement conversation archiving for old sessions
- Add rate limiting for feedback collection
- Optimize exemplar selection algorithms
- Implement Tavily search result caching and CDN
- Add rate limiting for Tavily API calls

### 5.3 Security
- Ensure proper RLS policies for all new tables
- Validate user permissions for exemplar management
- Sanitize user feedback input
- Implement proper error handling
- Secure Tavily API keys
- Validate and sanitize artwork URLs before display

### 5.4 User Experience
- Provide clear feedback on conversation saving
- Offer intuitive exemplar management interface
- Implement smooth transitions between conversation sessions
- Add helpful onboarding for new features
- Provide clear artwork search results with quality indicators
- Implement intuitive "Search More" workflow
- Add artwork previews and aspect ratio warnings

## 6. Success Metrics

### 6.1 User Engagement
- Conversation session retention rate
- Average conversation length
- User feedback participation rate
- Exemplar creation frequency

### 6.2 System Performance
- Exemplar selection relevance scores
- Conversation search accuracy
- Response quality improvements
- System response times
- Tavily artwork search result quality and relevance
- Tavily API response times and reliability

### 6.3 Business Impact
- User satisfaction scores
- Feature adoption rates
- Support ticket reduction
- User retention improvements

*Note: Detailed analytics and monitoring will be implemented in a later iteration.*

## 7. Future Enhancements

### 7.1 Advanced Features
- Conversation sharing between users
- Collaborative exemplar curation
- Advanced conversation analytics
- Integration with external music databases

### 7.2 AI Improvements
- Multi-modal conversation support
- Advanced conversation summarization
- Predictive exemplar selection
- Automated conversation tagging

### 7.3 Platform Extensions
- Mobile app support
- API for third-party integrations
- Webhook support for external systems
- Advanced export/import capabilities 