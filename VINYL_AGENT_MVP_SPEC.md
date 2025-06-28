# Vinyl Agent MVP Specification

## Project Overview
A progressive web application that allows users to manage their vinyl record collection through a chat interface. Users can photograph album covers, have them automatically recognized and populated, review the information, and add records to their personal database.

## Core User Journey
1. User opens PWA at hosted URL
2. User logs in/authenticates
3. User uploads photo of album cover
4. Agent recognizes album and fetches metadata
5. User reviews and approves information
6. Record is added to user's database

## Technical Stack Requirements
- **Frontend**: React/Next.js PWA with chat interface
- **Backend**: Next.js API routes with Supabase integration
- **Database**: Supabase PostgreSQL (existing setup)
- **Authentication**: Supabase Auth (existing setup)
- **Storage**: Supabase Storage buckets (existing setup)
- **Edge Functions**: Supabase Edge Functions (existing setup)
- **Image Recognition**: Integration with album cover recognition API
- **Album Metadata**: Integration with music database API (Discogs, MusicBrainz, etc.)
- **Deployment**: Hosted solution (Vercel, Railway, etc.)

## Feature Breakdown & Development Prompts

### 1. Project Setup & Architecture

**Prompt 1: "Set up a Next.js 14 project with TypeScript, Tailwind CSS, and PWA capabilities. Configure Supabase client integration using the existing database, auth, storage, and edge functions setup. Include proper folder structure for API routes and components. Set up ESLint, Prettier, and Husky for code quality. Include environment variable configuration for Supabase and deployment setup."**

**Deliverables:**
- Next.js project with TypeScript
- Tailwind CSS configuration
- PWA manifest and service worker
- Supabase client configuration
- Environment variable templates
- Deployment configuration
- Code quality tools setup

### 2. Database Schema & Models

**Prompt 2: "Design and implement database tables in the existing Supabase PostgreSQL instance for a vinyl record collection management system. Include tables for users (leveraging existing auth.users), albums, artists, genres, and user_albums (junction table). Create TypeScript interfaces and Supabase type definitions. Include proper relationships, indexes, and RLS (Row Level Security) policies. Set up database migrations and seeding scripts."**

**Deliverables:**
- Supabase database schema with all tables
- TypeScript interfaces for all models
- Supabase type generation setup
- RLS policies for data security
- Database migration scripts
- Seed data for testing
- Database connection utilities

### 3. User Authentication System

**Prompt 3: "Implement authentication using the existing Supabase Auth system. Create React components for login/register forms with proper validation and error handling. Implement protected routes, session management, and user profile handling. Leverage Supabase Auth UI components and integrate with the existing auth setup."**

**Deliverables:**
- Supabase Auth integration
- Login/register React components
- Protected route components
- Session management utilities
- User profile handling
- Auth state management

### 4. Chat Interface Foundation

**Prompt 4: "Create a modern, responsive chat interface using React and Tailwind CSS. Include message bubbles, typing indicators, file upload capabilities, and real-time message updates. Implement proper message threading, timestamps, and user avatars. Make it mobile-first and accessible."**

**Deliverables:**
- Chat component with message bubbles
- File upload interface
- Typing indicators
- Message threading system
- Responsive design
- Accessibility features

### 5. Image Upload & Processing

**Prompt 5: "Implement image upload functionality with drag-and-drop support, image preview, compression, and integration with existing Supabase Storage buckets. Include file validation, progress indicators, and error handling. Set up image processing pipeline for album cover recognition preparation using Supabase Storage."**

**Deliverables:**
- Drag-and-drop image upload
- Image preview component
- File validation utilities
- Supabase Storage integration
- Image compression utilities
- Upload progress indicators

### 6. Album Cover Recognition Integration

**Prompt 6: "Integrate with album cover recognition APIs (Google Vision API, AWS Rekognition, or similar) to identify album covers from uploaded images. Implement fallback mechanisms and error handling. Create utilities for extracting album metadata from recognition results. Consider using Supabase Edge Functions for API calls to keep keys secure."**

**Deliverables:**
- Image recognition API integration
- Album cover detection utilities
- Fallback recognition methods
- Error handling for failed recognition
- Metadata extraction utilities
- Supabase Edge Function for API calls

### 7. Music Database Integration

**Prompt 7: "Integrate with music database APIs (Discogs, MusicBrainz, Spotify) to fetch comprehensive album metadata including artist, title, year, genre, track listing, and high-resolution cover art. Implement caching, rate limiting, and multiple API fallbacks for reliability. Use Supabase Edge Functions for API calls and caching."**

**Deliverables:**
- Music database API integrations
- Metadata fetching utilities
- High-res cover art retrieval
- API rate limiting
- Caching system using Supabase
- Fallback API mechanisms
- Edge Functions for API calls

### 8. Album Review & Approval Interface

**Prompt 8: "Create an album review interface that displays fetched metadata in an editable form. Include fields for album title, artist, year, genre, track listing, and cover art. Implement edit capabilities, validation, and approval workflow. Add ability to manually correct recognition errors."**

**Deliverables:**
- Album review form component
- Editable metadata fields
- Form validation
- Cover art preview
- Approval workflow
- Manual correction interface

### 9. Database CRUD Operations

**Prompt 9: "Implement complete CRUD operations for vinyl records using Supabase client. Include API endpoints for creating, reading, updating, and deleting album records. Implement proper error handling, validation, and user authorization using RLS policies. Create utilities for bulk operations and data export."**

**Deliverables:**
- Album CRUD operations using Supabase
- Database operation utilities
- Input validation
- Error handling
- RLS policy enforcement
- Bulk operation utilities

### 10. Album Collection Management

**Prompt 10: "Create a collection view that displays all user albums in a grid/list format with search, filter, and sort capabilities. Include album details modal, edit functionality, and delete confirmation. Implement pagination and responsive design for large collections using Supabase queries."**

**Deliverables:**
- Album collection grid/list view
- Search and filter functionality
- Sort options
- Album detail modal
- Edit/delete capabilities
- Pagination system using Supabase

### 11. Real-time Chat Agent

**Prompt 11: "Implement a chat agent that can process user messages, handle image uploads, trigger album recognition, and guide users through the album addition process. Include natural language processing for commands and contextual responses. Implement conversation state management using Supabase real-time subscriptions."**

**Deliverables:**
- Chat agent logic
- Message processing system
- Conversation state management
- Natural language command parsing
- Contextual response generation
- Workflow guidance system
- Real-time message updates

### 12. PWA Features & Deployment

**Prompt 12: "Configure PWA features including offline support, push notifications, and app-like experience. Set up deployment pipeline with environment-specific configurations. Implement proper error boundaries, loading states, and performance optimization. Add analytics and monitoring."**

**Deliverables:**
- PWA manifest configuration
- Service worker implementation
- Offline functionality
- Push notification setup
- Deployment pipeline
- Performance optimization
- Error monitoring

## MVP Success Criteria

### Functional Requirements
- [ ] User can register and log in using Supabase Auth
- [ ] User can upload album cover photos to Supabase Storage
- [ ] System recognizes album covers automatically
- [ ] System fetches album metadata from music databases
- [ ] User can review and edit album information
- [ ] User can approve and save albums to their Supabase database
- [ ] User can view their album collection
- [ ] Chat interface guides users through the process

### Technical Requirements
- [ ] Responsive PWA that works on mobile and desktop
- [ ] Secure authentication system using Supabase Auth
- [ ] Reliable image recognition with fallbacks
- [ ] Fast metadata retrieval with caching
- [ ] Scalable database architecture using Supabase
- [ ] Error handling and user feedback
- [ ] Offline capability for basic functions

### User Experience Requirements
- [ ] Intuitive chat-based interface
- [ ] Fast response times (< 3 seconds for recognition)
- [ ] Clear feedback and progress indicators
- [ ] Easy error recovery
- [ ] Mobile-optimized experience
- [ ] Accessible design

## Development Phases

### Phase 1: Foundation (Prompts 1-3)
- Project setup and Supabase integration
- Database schema and models
- Authentication system using Supabase Auth

### Phase 2: Core Features (Prompts 4-7)
- Chat interface
- Image upload and processing with Supabase Storage
- Album recognition integration
- Music database integration

### Phase 3: User Experience (Prompts 8-11)
- Album review interface
- Database operations using Supabase
- Collection management
- Chat agent implementation

### Phase 4: Polish & Deploy (Prompt 12)
- PWA features
- Deployment setup
- Performance optimization

## API Integrations Required

1. **Image Recognition**: Google Vision API or AWS Rekognition (via Supabase Edge Functions)
2. **Music Metadata**: Discogs API, MusicBrainz API, or Spotify API (via Supabase Edge Functions)
3. **Image Storage**: Supabase Storage buckets (existing)
4. **Authentication**: Supabase Auth (existing)
5. **Database**: Supabase PostgreSQL (existing)

## Security Considerations

- Secure file upload validation
- API key management via Supabase Edge Functions
- User data encryption
- Rate limiting
- Input sanitization
- CORS configuration
- RLS policies for data access

## Performance Considerations

- Image compression and optimization
- API response caching using Supabase
- Database query optimization
- Lazy loading for large collections
- CDN for static assets
- Edge Functions for serverless API calls

## Supabase-Specific Benefits

- **Built-in Auth**: No need to implement JWT handling
- **Real-time**: Built-in subscriptions for live updates
- **Storage**: Managed file storage with CDN
- **Edge Functions**: Serverless API calls with secure key management
- **RLS**: Row-level security for data protection
- **Type Safety**: Auto-generated TypeScript types

This specification leverages your existing Supabase infrastructure to accelerate development while maintaining security and scalability. 