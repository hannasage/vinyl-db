# Vinyl Agent v1.5 Specification

## Overview

Vinyl Agent v1.5 focuses on enhancing the collection insights capabilities through web search integration, improving the album add/remove user experience, and resolving critical artwork display issues.

## Goals

1. **Enhance collection insight RAG with Tavily search** - Enable web-based research for questions that can't be answered from collection metadata alone
2. **Upgrade album add/remove UI and approval workflow** - Improve the user experience with drag-and-drop artwork upload and optional cover search
3. **Fix the bug with album artwork not displaying** - Resolve configuration issues preventing artwork from rendering properly

---

## 1. Tavily Search Integration

### Objective
Implement web search capabilities to answer user questions that cannot be resolved using only collection metadata.

### Use Cases
- **Genre identification**: "What genre is Reputation?"
- **Release date verification**: "When did Abbey Road actually come out?"
- **Artist background**: "Who produced this album?"
- **Album context**: "What was happening when this album was released?"
- **Critical reception**: "How was this album received when it came out?"

### Implementation Details

#### New Tool: `vinyl_web_search`
```typescript
interface WebSearchParams {
  query: string;
  searchType: 'genre' | 'release_info' | 'artist_info' | 'context' | 'reception';
  albumName?: string;
  artistName?: string;
  year?: number;
}
```

#### Tavily API Integration
- **API Key**: Store `TAVILY_API_KEY` in Supabase environment variables
- **Search Types**: Configure for music-specific searches
- **Rate Limiting**: Implement appropriate rate limiting to manage API costs
- **Caching**: Cache search results to avoid duplicate API calls

#### Response Format
```typescript
interface WebSearchResult {
  success: boolean;
  query: string;
  answer: string;
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  confidence: number;
  searchType: string;
}
```

#### Example Interactions

**User**: "What genre is Reputation?"
**Agent**: "Taylor Swift's *Reputation* is a defining **pop** album of the 2010s! It incorporates elements of electropop, synth-pop, and trap music, marking a significant departure from her earlier country-pop sound."

**User**: "When did Abbey Road actually come out?"
**Agent**: "The Beatles' *Abbey Road* was released on **September 26, 1969** in the UK and **October 1, 1969** in the US. It was the last album the band recorded together, though *Let It Be* was released later."

### Integration Points
- **Semantic Search Enhancement**: When collection queries return no results, suggest web search
- **Insights Tool**: Integrate web search into collection insights for richer analysis
- **Fallback Strategy**: Use web search as fallback when metadata is insufficient

---

## 2. Album Add/Remove UI/UX Improvements

### Objective
Create a more intuitive and feature-rich interface for album addition and removal operations.

### Current Issues
- Limited artwork options during add/remove process
- No user control over artwork selection
- Basic confirmation workflow
- No drag-and-drop functionality

### New Workflow

#### Add Album Flow
1. **Initial Request**: User requests album addition
2. **Confirmation Card**: Display album details with enhanced UI
3. **Artwork Options**:
   - **Upload Area**: Drag-and-drop zone for custom artwork
   - **Search Button**: "Find Cover Art" button for Tavily search
   - **Preview**: Real-time preview of selected artwork
4. **Confirmation**: User reviews and confirms addition

#### Remove Album Flow
1. **Initial Request**: User requests album removal
2. **Confirmation Card**: Display album details with artwork
3. **Confirmation**: User confirms removal with clear warning

### UI Components

#### AlbumConfirmationCard Enhancements
```typescript
interface EnhancedConfirmationCard {
  album: {
    title: string;
    artist: string;
    releaseYear?: number;
    currentArtwork?: string;
  };
  action: 'add' | 'remove';
  artworkOptions: {
    allowUpload: boolean;
    allowSearch: boolean;
    currentArtwork?: string;
    uploadedArtwork?: File;
    searchedArtwork?: string;
  };
  onConfirm: (artworkUrl?: string) => void;
  onCancel: () => void;
}
```

#### ArtworkUpload Component
- **Drag-and-Drop Zone**: Visual area for file upload
- **File Validation**: Accept only image files (JPG, PNG, WebP)
- **Size Limits**: Maximum 5MB file size
- **Preview**: Real-time image preview
- **Upload Progress**: Visual feedback during upload

#### ArtworkSearch Component
- **Search Button**: "Find Cover Art" with loading state
- **Results Grid**: Display found artwork options
- **Selection**: Click to select preferred artwork
- **Fallback**: "No results found" state

### Storage Integration

#### Supabase Storage Configuration
- **Bucket**: `artwork` bucket for user-uploaded images
- **Path Structure**: `user-uploads/{userId}/{albumId}/{filename}`
- **Permissions**: User can only access their own uploads
- **Cleanup**: Remove orphaned files when albums are deleted

#### File Upload Process
1. **Validation**: Check file type and size
2. **Processing**: Resize/optimize if necessary
3. **Upload**: Store in Supabase storage
4. **Database Update**: Link artwork URL to album record
5. **Cleanup**: Remove old artwork if replaced

### API Endpoints

#### New Supabase Function: `upload-artwork`
```typescript
interface UploadArtworkParams {
  albumId: string;
  file: File;
  userId: string;
}

interface UploadArtworkResult {
  success: boolean;
  artworkUrl: string;
  error?: string;
}
```

#### Enhanced Chat Response
- **Artwork URLs**: Include artwork URLs in album data
- **Upload Support**: Handle artwork upload requests
- **Search Integration**: Coordinate with Tavily search for cover art

---

## 3. Album Artwork Display Bug Fix

### Problem Statement
Some album artwork is not displaying properly, likely due to host URL configuration issues.

### Investigation Areas

#### 1. Supabase Storage Configuration
- **CORS Settings**: Verify CORS headers allow frontend access
- **Public Access**: Ensure artwork bucket is publicly accessible
- **URL Format**: Check if URLs are properly formatted for frontend consumption

#### 2. Frontend Image Loading
- **Error Handling**: Implement proper error handling for failed image loads
- **Fallback Images**: Provide default artwork for failed loads
- **Loading States**: Show loading indicators during image fetch

#### 3. Database URL Storage
- **URL Validation**: Ensure URLs are properly stored and retrieved
- **URL Format**: Verify URLs are absolute and accessible
- **CDN Integration**: Check if CDN URLs are properly configured

### Diagnostic Steps

#### 1. URL Analysis
- Log all artwork URLs being requested
- Test URLs directly in browser
- Check for URL encoding issues

#### 2. Network Analysis
- Monitor network requests in browser dev tools
- Check for CORS errors
- Verify response headers

#### 3. Storage Permissions
- Test bucket access permissions
- Verify RLS policies
- Check public access settings

### Implementation Plan

#### Phase 1: Diagnosis
1. **Logging**: Add comprehensive logging for artwork requests
2. **Testing**: Test artwork URLs in isolation
3. **Analysis**: Identify common failure patterns

#### Phase 2: Configuration Fixes
1. **CORS**: Update Supabase storage CORS settings
2. **Permissions**: Verify and fix bucket permissions
3. **URLs**: Ensure proper URL formatting

#### Phase 3: Frontend Improvements
1. **Error Handling**: Implement robust error handling
2. **Fallbacks**: Add default artwork for failed loads
3. **Loading States**: Improve user experience during loading

#### Phase 4: Testing
1. **Regression Testing**: Ensure fixes don't break existing functionality
2. **Edge Cases**: Test with various URL formats and file types
3. **Performance**: Verify image loading performance

---

## Technical Requirements

### Dependencies
- **Tavily API**: Web search integration
- **Supabase Storage**: Enhanced file upload capabilities
- **Image Processing**: Client-side image optimization (optional)

### Environment Variables
```bash
TAVILY_API_KEY=your_tavily_api_key
SUPABASE_STORAGE_URL=your_storage_url
```

### Database Schema Updates
```sql
-- Add artwork_url column to album table if not exists
ALTER TABLE album ADD COLUMN IF NOT EXISTS artwork_url TEXT;

-- Add index for faster artwork queries
CREATE INDEX IF NOT EXISTS idx_album_artwork_url ON album(artwork_url);
```

---

## Success Metrics

### Tavily Integration
- **Response Accuracy**: 90%+ accurate answers to web search queries
- **Response Time**: <3 seconds for web search results
- **User Satisfaction**: Positive feedback on web search capabilities

### UI/UX Improvements
- **Upload Success Rate**: 95%+ successful artwork uploads
- **User Engagement**: Increased usage of add/remove features
- **Error Reduction**: 50% reduction in user-reported issues

### Artwork Display Fix
- **Display Success Rate**: 99%+ successful artwork displays
- **Error Reduction**: 90% reduction in artwork loading errors
- **Performance**: <1 second average image load time

---

## Implementation Timeline

### Week 1-2: Tavily Integration
- Set up Tavily API integration
- Implement web search tool
- Add to chat response workflow
- Testing and refinement

### Week 3-4: UI/UX Improvements
- Design and implement enhanced confirmation cards
- Add drag-and-drop upload functionality
- Integrate artwork search capabilities
- Update storage configuration

### Week 5-6: Artwork Bug Fix
- Diagnose artwork display issues
- Implement configuration fixes
- Add error handling and fallbacks
- Comprehensive testing

### Week 7: Integration and Testing
- End-to-end testing
- Performance optimization
- Documentation updates
- Deployment preparation

---

## Risk Mitigation

### Tavily API
- **Rate Limiting**: Implement proper rate limiting to manage costs
- **Fallback Strategy**: Graceful degradation when API is unavailable
- **Cost Monitoring**: Track API usage and costs

### File Upload
- **Security**: Validate all uploaded files
- **Storage Limits**: Implement storage quotas
- **Error Handling**: Robust error handling for upload failures

### Artwork Display
- **Backward Compatibility**: Ensure existing artwork continues to work
- **Performance**: Optimize image loading for large collections
- **Accessibility**: Maintain accessibility standards

---

## Future Considerations

### Advanced Features
- **Batch Operations**: Add/remove multiple albums at once
- **Artwork AI**: AI-powered artwork enhancement
- **Social Features**: Share collection insights
- **Export/Import**: Collection backup and restore

### Performance Optimizations
- **Image CDN**: Implement CDN for faster image delivery
- **Caching**: Advanced caching strategies
- **Lazy Loading**: Implement lazy loading for large collections

### Integration Opportunities
- **Music APIs**: Integration with Spotify, Apple Music APIs
- **Social Platforms**: Share to social media
- **Analytics**: Advanced collection analytics 