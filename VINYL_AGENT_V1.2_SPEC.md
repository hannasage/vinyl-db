# Vinyl Collection Agent v1.2 Specification

## Overview

Building on the successful chat-based vinyl collection management system in v1.1, v1.2 introduces two major enhancements:

1. **Improved Chat UI** - Floating chat button for seamless access
2. **Enhanced RAG Capabilities** - Predefined schemas for comprehensive database queries

## 1. Improved Chat UI

### 1.1 Floating Chat Button

**Implementation:**
- Add a floating chat button in the bottom right corner of the screen
- Button appears only when user is logged in
- Clicking the button opens the chat interface in a modal/overlay
- Chat interface maintains all existing functionality from v1.1

**Design Requirements:**
- Floating button with ai icon
- Smooth animations for open/close transitions
- Responsive design for mobile and desktop
- Non-intrusive positioning that doesn't interfere with existing UI

### 1.2 UI Integration

**Page Integration:**
- Remove the old `/admin/manage` page entirely
- Update `/admin` route to redirect to home page (`/`)
- Chat button appears on all pages when user is authenticated
- Maintain existing authentication flow (no login UI changes needed)

**Component Structure:**
- `components/FloatingChatButton.tsx` - The floating button component
- `components/ChatModal.tsx` - Modal overlay containing chat interface
- Integrate existing `ChatInterface.tsx` into the modal

## 2. Enhanced RAG Capabilities

### 2.1 Predefined Query Schemas

**Schema 1: Complete Collection Overview**
- **Purpose**: Get comprehensive overview of entire vinyl collection
- **Query**: Retrieve all albums with artist information, release years, acquisition dates
- **Use Cases**: "Show me my entire collection", "Give me an overview of what I have"
- **Data**: All albums, artists, metadata, statistics

**Schema 2: Complete Artist Catalog**
- **Purpose**: Get all albums by a specific artist
- **Query**: Retrieve all albums for a given artist with full details
- **Use Cases**: "Show me all my Beatles albums", "What do I have by Prince?"
- **Data**: All albums by artist, release years, variants, acquisition dates

**Schema 3: Fuzzy Album Search**
- **Purpose**: Find albums with partial name matches
- **Query**: Search album titles containing search term (case-insensitive, partial match)
- **Use Cases**: "Find albums with 'brat' in the title", "Search for 'dark' albums"
- **Data**: Albums matching search pattern, artist information

### 2.2 New Tool Definitions

**Enhanced TOOLS Object:**
```typescript
const TOOLS = {
  // Existing tools...
  vinyl_collection_query: { /* existing */ },
  vinyl_add_album: { /* existing */ },
  vinyl_remove_album: { /* existing */ },
  
  // New RAG tools
  vinyl_collection_overview: {
    name: 'vinyl_collection_overview',
    description: 'Get a comprehensive overview of the entire vinyl collection including statistics and all albums',
    inputSchema: {
      type: 'object',
      properties: {
        includeStats: { type: 'boolean', description: 'Include collection statistics (default: true)' },
        limit: { type: 'number', description: 'Maximum number of albums to return (default: 100)' },
        sortBy: { type: 'string', description: 'Sort by: acquired_date, title, artist, release_year (default: acquired_date)' }
      }
    }
  },
  
  vinyl_artist_catalog: {
    name: 'vinyl_artist_catalog',
    description: 'Get all albums by a specific artist with complete details',
    inputSchema: {
      type: 'object',
      properties: {
        artistName: { type: 'string', description: 'Artist name to search for (required)' },
        includeStats: { type: 'boolean', description: 'Include artist-specific statistics (default: true)' }
      },
      required: ['artistName']
    }
  },
  
  vinyl_fuzzy_search: {
    name: 'vinyl_fuzzy_search',
    description: 'Search for albums with partial name matches (fuzzy search)',
    inputSchema: {
      type: 'object',
      properties: {
        searchTerm: { type: 'string', description: 'Search term to find in album titles (required)' },
        limit: { type: 'number', description: 'Maximum number of results (default: 20)' }
      },
      required: ['searchTerm']
    }
  }
};
```

### 2.3 Execution Functions

**New Execution Functions:**
```typescript
async function executeVinylCollectionOverview(params: any, supabase: any): Promise<any> {
  // Implementation for complete collection overview
  // Returns all albums with statistics
}

async function executeVinylArtistCatalog(params: any, supabase: any): Promise<any> {
  // Implementation for artist catalog
  // Returns all albums by specific artist
}

async function executeVinylFuzzySearch(params: any, supabase: any): Promise<any> {
  // Implementation for fuzzy album search
  // Returns albums matching partial search terms
}
```

## 3. Implementation Plan

### Phase 1: Floating Chat UI (Week 1)
- [ ] Create `FloatingChatButton` component
- [ ] Create `ChatModal` component
- [ ] Integrate existing `ChatInterface` into modal
- [ ] Add floating button to layout
- [ ] Remove `/admin/manage` page
- [ ] Update `/admin` route to redirect to home

### Phase 2: Enhanced RAG Tools (Week 2)
- [ ] Add new tool definitions to TOOLS object
- [ ] Implement `executeVinylCollectionOverview` function
- [ ] Implement `executeVinylArtistCatalog` function
- [ ] Implement `executeVinylFuzzySearch` function
- [ ] Update `executeOperation` function to handle new tools
- [ ] Test new RAG capabilities

### Phase 3: Integration and Testing (Week 3)
- [ ] Integrate floating chat with existing authentication
- [ ] Test all new RAG queries
- [ ] Optimize performance for large collections
- [ ] Add error handling for edge cases
- [ ] Final testing and refinement

## 4. Technical Considerations

### 4.1 Performance
- Implement pagination for large collection overviews
- Optimize fuzzy search queries
- Add caching for frequently accessed data
- Ensure responsive chat modal performance

### 4.2 User Experience
- Smooth animations for chat modal
- Clear visual feedback for search results
- Intuitive floating button placement
- Maintain existing chat functionality

### 4.3 Security
- Maintain existing authentication checks
- Validate all search parameters
- Ensure proper data access controls
- Sanitize user inputs

## 5. Success Metrics

### 5.1 User Experience
- Chat accessibility improvement
- Search result relevance
- Response time for new queries
- User satisfaction with floating UI

### 5.2 System Performance
- Query execution speed
- Memory usage optimization
- Database query efficiency
- Modal performance

## 6. Future Considerations

### 6.1 Potential Enhancements
- Advanced filtering options
- Search result sorting
- Export functionality
- Collection analytics

### 6.2 Scalability
- Handle very large collections
- Optimize for mobile performance
- Consider advanced search algorithms
- Plan for additional query schemas 