# Vinyl Collection Agent v1.2 Specification

## Overview

Building on the successful chat-based vinyl collection management system in v1.1, v1.2 introduces two major enhancements:

1. **Long-term Memory** - Persistent conversation storage with infinite scroll pagination
2. **User Feedback System** - Ability for users to mark exceptional conversations with thumbs up/down

## 1. Long-term Memory

### 1.1 Database Schema Extensions

#### New Tables

**conversation_messages Table:**
- `id`: UUID primary key for message identification
- `user_id`: Foreign key to auth.users table with cascade delete
- `content`: Text content of the message (required)
- `sender`: Text field with check constraint ('user' or 'agent')
- `message_type`: Text field for message type (default: 'text')
- `timestamp`: Timestamp when message was created
- `metadata`: JSONB field for additional message metadata
- `sequence_number`: Integer for message ordering (global sequence for user)

**conversation_embeddings Table:**
- `id`: UUID primary key for embedding identification
- `message_id`: Foreign key to conversation_messages table with cascade delete
- `embedding`: Vector field (1536 dimensions) for Supabase embeddings
- `created_at`: Timestamp when embedding was created

**Database Indexes:**
- Vector similarity index on conversation_embeddings for efficient semantic search
- Standard indexes on foreign keys and frequently queried fields
- Index on sequence_number for efficient pagination

#### RLS Policies

**conversation_messages Policies:**
- **SELECT Policy**: Users can only view their own messages
- **INSERT Policy**: Users can only add messages for themselves
- **UPDATE Policy**: Users can only update their own messages

**conversation_embeddings Policies:**
- **SELECT Policy**: Users can only access embeddings from their own messages
- **INSERT Policy**: Users can only create embeddings for their own messages
- **UPDATE Policy**: Users can only update embeddings for their own messages

**Security Implementation:**
- All policies use `auth.uid()` to ensure user isolation
- Cascade deletes ensure data consistency when messages are removed
- Foreign key relationships maintain referential integrity

### 1.2 Memory Management System

#### Enhanced Memory Manager (`utils/agent/memory.ts`)

**Data Interfaces:**

**ConversationMessage Interface:**
- `id`: Unique message identifier
- `content`: Message text content
- `sender`: Message sender ('user' or 'agent')
- `messageType`: Type of message (text, image, etc.)
- `timestamp`: Message creation timestamp
- `metadata`: Optional additional message data
- `sequenceNumber`: Global message order for user

**EnhancedMemoryManager Class:**

**Memory Functions:**
- `saveMessage()`: Persist message to database with embedding
- `getMessages()`: Retrieve messages with pagination (10 messages per page)
- `getRecentContext()`: Get recent conversation context for AI prompts
- `searchSimilarMessages()`: Find similar messages using semantic search
- `loadMoreMessages()`: Load next page of messages for infinite scroll

**Memory Management Strategy:**
- Single conversation thread per user
- Pagination with 10 messages per page
- Infinite scroll with "Show More" functionality
- Use Supabase embeddings for semantic search
- Maintain conversation context for AI prompts

### 1.3 UI Components

#### Enhanced Chat Interface (`components/EnhancedChatInterface.tsx`)

**Component Interface:**
- `messages`: Array of conversation messages
- `onLoadMore`: Callback to load more messages
- `hasMoreMessages`: Boolean indicating if more messages exist
- `isLoadingMore`: Boolean for loading state

**Features:**
- Display last 10 messages in vertical scroll
- "Show More" button to load next 10 messages
- Infinite scroll pagination
- Loading states for message retrieval
- Responsive design for mobile and desktop
- Smooth scrolling and transitions

## 2. User Feedback System

### 2.1 Database Schema

**conversation_feedback Table:**
- `id`: UUID primary key for feedback identification
- `message_id`: Foreign key to conversation_messages table with cascade delete
- `user_id`: Foreign key to auth.users table with cascade delete
- `feedback_type`: Text field with check constraint ('thumbs_up' or 'thumbs_down')
- `created_at`: Timestamp when feedback was provided

**exemplar_messages Table:**
- `id`: UUID primary key for exemplar identification
- `message_id`: Foreign key to conversation_messages table with cascade delete
- `user_id`: Foreign key to auth.users table with cascade delete
- `exemplar_type`: Text field with check constraint ('positive' or 'negative') - required
- `embedding`: Vector field (1536 dimensions) for Supabase embeddings
- `created_at`: Timestamp when exemplar was created
- `usage_count`: Integer count of how often exemplar has been used
- `last_used`: Timestamp when exemplar was last used in prompts
- `is_active`: Boolean flag indicating if exemplar is active

**Data Relationships:**
- Feedback is linked to specific agent messages
- Exemplars are created from feedback-marked agent messages
- Cascade deletes ensure data consistency
- User isolation maintained through foreign key relationships

### 2.2 Feedback Components

#### Message Feedback (`components/MessageFeedback.tsx`)

**Component Interface:**
- `messageId`: Current agent message identifier
- `onFeedbackSubmit`: Callback when user provides feedback
- `currentFeedback`: Currently selected feedback type (if any)

**Features:**
- Simple thumbs up/down feedback buttons
- Positioned below each agent response
- Toggle functionality (user can change feedback)
- Automatic exemplar creation based on feedback
- Feedback persistence
- Clear visual states for feedback status

### 2.3 Feedback Integration

#### Chat UI Integration

- Thumbs up/down buttons positioned below each agent response
- Visual feedback indicators for marked messages
- Ability to toggle feedback (change from thumbs up to thumbs down or vice versa)
- Automatic exemplar creation based on feedback (positive exemplars for thumbs up, negative exemplars for thumbs down)

#### Exemplar Types

- **Positive Exemplars**: Agent messages marked with thumbs up - demonstrate good practices
- **Negative Exemplars**: Agent messages marked with thumbs down - demonstrate what to avoid
- Both types are used in dynamic few-shot prompting to guide the AI's behavior

## 3. Dynamic Few-Shot Prompting

### 3.1 Semantic Search for Relevant Exemplars

**ExemplarSelector Class**

The system will implement an `ExemplarSelector` class that provides two main functions:

1. **General Exemplar Search** (`findRelevantExemplars`):
   - Generate embedding for current query + conversation context using Supabase
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
1. **Embedding Generation**: Convert current query and context to vector embedding using Supabase
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
- **Positive/Negative Exemplar**: [Agent message content]
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
- **Recency**: How old the exemplar is (days since creation)
- **Exemplar Type**: Positive or negative exemplar

**Quality Score Calculation:**
- Simple scoring based on usage frequency and recency
- Higher scores for frequently used, recent exemplars
- Lower scores for rarely used or very old exemplars

**Quality Metrics:**
- `usageCount`: Number of times exemplar has been used
- `recency`: Days since exemplar creation
- `exemplarType`: Positive or negative classification

**Pruning Function** (`pruneLowQualityExemplars`):
- **Low Usage Threshold**: Deactivate exemplars with score < 0.3
- **Age Threshold**: Deactivate exemplars older than 365 days
- **Automatic Cleanup**: Run periodically to maintain exemplar quality
- **Safe Deactivation**: Mark as inactive rather than delete

## 4. Implementation Plan

### Phase 1: Database and Core Infrastructure (Week 1-2)
- [ ] Create new database tables and migrations
- [ ] Implement RLS policies
- [ ] Create enhanced memory manager
- [ ] Set up Supabase embeddings integration

### Phase 2: Long-term Memory (Week 3-4)
- [ ] Implement conversation persistence with pagination
- [ ] Add enhanced chat interface with infinite scroll
- [ ] Integrate with existing chat interface
- [ ] Add "Show More" functionality

### Phase 3: Feedback System (Week 5-6)
- [ ] Implement thumbs up/down feedback components
- [ ] Add exemplar creation functionality (positive/negative)
- [ ] Integrate feedback into chat UI below agent responses
- [ ] Set up automatic exemplar embedding generation

### Phase 4: Dynamic Few-Shot Prompting (Week 7-8)
- [ ] Implement exemplar selection system
- [ ] Add semantic search capabilities using Supabase
- [ ] Integrate dynamic prompting into chat response
- [ ] Add exemplar quality management

### Phase 5: Testing and Optimization (Week 9-10)
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

### 5.2 Scalability
- Consider vector database migration for large-scale exemplar storage
- Implement conversation archiving for old sessions
- Add rate limiting for feedback collection
- Optimize exemplar selection algorithms

### 5.3 Security
- Ensure proper RLS policies for all new tables
- Validate user permissions for exemplar management
- Sanitize user feedback input
- Implement proper error handling

### 5.4 User Experience
- Provide clear feedback on conversation saving
- Implement smooth infinite scroll pagination
- Add helpful onboarding for new features
- Ensure responsive design for mobile and desktop

## 6. Success Metrics

### 6.1 User Engagement
- Conversation message retention rate
- Average conversation length
- User feedback participation rate
- Exemplar creation frequency

### 6.2 System Performance
- Exemplar selection relevance scores
- Conversation search accuracy
- Response quality improvements
- System response times

### 6.3 Business Impact
- User satisfaction scores
- Feature adoption rates
- Support ticket reduction
- User retention improvements

*Note: Detailed analytics and monitoring will be implemented in a later iteration.*

## 7. Future Enhancements

### 7.1 Advanced Features
- Conversation sharing between users
- Advanced conversation analytics
- Integration with external music databases
- Exemplar management interface (future enhancement)

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