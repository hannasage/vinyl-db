// @ts-nocheck

Deno.serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        }
      });
    }

    // Get Tavily API key
    const tavilyApiKey = Deno.env.get('TAVILY_API_KEY');
    if (!tavilyApiKey) {
      return new Response(JSON.stringify({
        error: 'Missing Tavily API key',
        message: 'TAVILY_API_KEY environment variable is not set'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Get the request body
    const requestData = await req.json().catch(() => ({}));
    const { 
      albumName, 
      artistName, 
      releaseYear, 
      preferredSize = 'large', 
      maxResults = 5 
    } = requestData;
    
    console.log(`[fetch-album-artwork] Request: albumName="${albumName}", artistName="${artistName}", releaseYear=${releaseYear}`);
    
    // Validate required parameters
    if (!albumName || !artistName) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters',
        message: 'Both albumName and artistName are required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Build search queries with different strategies
    const searchQueries = [];
    
    // Primary search: simple artist + album name
    const primaryQuery = `${artistName} ${albumName}`;
    searchQueries.push(primaryQuery);
    
    // Fallback search: album name first
    const fallbackQuery = `${albumName} ${artistName}`;
    searchQueries.push(fallbackQuery);
    
    // Alternative search: with "album" keyword
    const albumQuery = `${artistName} ${albumName} album`;
    searchQueries.push(albumQuery);

    const allResults = [];
    
    // Search with each query strategy
    for (const query of searchQueries) {
      try {
        console.log(`[fetch-album-artwork] Searching: "${query}"`);
        
        const searchResponse = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tavilyApiKey}`
          },
          body: JSON.stringify({
            query,
            search_depth: 'basic',
            include_images: true,
            include_answer: false,
            include_raw_content: false,
            max_results: Math.ceil(maxResults / searchQueries.length), // Distribute results across queries
            include_domains: [],
            exclude_domains: [],
            category: 'general',
            safety_level: 'moderate',
          })
        });

        if (!searchResponse.ok) {
          const errorText = await searchResponse.text();
          console.error(`[fetch-album-artwork] Tavily API error for "${query}":`, {
            status: searchResponse.status,
            statusText: searchResponse.statusText,
            errorText
          });
          throw new Error(`Tavily API error: ${searchResponse.status} ${searchResponse.statusText} - ${errorText}`);
        }

        const searchResult = await searchResponse.json();
        
        console.log(`[fetch-album-artwork] Tavily response for "${query}":`, {
          status: searchResponse.status,
          hasImages: !!searchResult.images,
          imageCount: searchResult.images?.length || 0,
          responseKeys: Object.keys(searchResult),
          firstImage: searchResult.images?.[0]
        });

        // Check for images in different possible fields
        let images = searchResult.images || searchResult.image_results || [];
        
        if (images && images.length > 0) {
          allResults.push(...images);
        } else {
          console.log(`[fetch-album-artwork] No images found in response for "${query}"`);
        }
      } catch (error) {
        console.error(`[fetch-album-artwork] Error with query "${query}":`, error);
        // Continue with other queries
      }
    }

    // Filter and process images
    const processedImages = [];
    const seenUrls = new Set();

    for (const image of allResults) {
      // Handle both string URLs and image objects
      const imageUrl = typeof image === 'string' ? image : image.url;
      
      if (!imageUrl || seenUrls.has(imageUrl)) continue;
      seenUrls.add(imageUrl);

      // Basic validation
      if (!imageUrl.startsWith('http')) continue;
      
      // Extract image info
      const imageInfo = {
        url: imageUrl,
        title: (typeof image === 'object' && image.title) ? image.title : `${albumName} by ${artistName}`,
        source: (typeof image === 'object' && image.source) ? image.source : 'Unknown',
        width: (typeof image === 'object' && image.width) ? image.width : 0,
        height: (typeof image === 'object' && image.height) ? image.height : 0,
        aspectRatio: 0,
        estimatedQuality: 'unknown'
      };

      // Calculate aspect ratio if we have dimensions
      if (imageInfo.width && imageInfo.height) {
        imageInfo.aspectRatio = imageInfo.width / imageInfo.height;
        
        // Quality assessment
        const minDimension = Math.min(imageInfo.width, imageInfo.height);
        const aspectRatio = imageInfo.aspectRatio;
        
        // Prefer square images (aspect ratio close to 1)
        const aspectScore = Math.abs(1 - aspectRatio);
        
        if (minDimension >= 1000) {
          imageInfo.estimatedQuality = 'excellent';
        } else if (minDimension >= 800) {
          imageInfo.estimatedQuality = 'good';
        } else if (minDimension >= 600) {
          imageInfo.estimatedQuality = 'acceptable';
        } else {
          imageInfo.estimatedQuality = 'low';
        }
        
        // Boost score for square images
        if (aspectScore < 0.1) {
          imageInfo.estimatedQuality = imageInfo.estimatedQuality === 'low' ? 'acceptable' : imageInfo.estimatedQuality;
        }
      } else {
        // For images without dimensions, assume good quality and square aspect ratio
        imageInfo.aspectRatio = 1;
        imageInfo.estimatedQuality = 'good';
      }

      processedImages.push(imageInfo);
    }

    // Sort by quality and relevance
    const qualityScores = { excellent: 4, good: 3, acceptable: 2, low: 1, unknown: 0 };
    processedImages.sort((a, b) => {
      const qualityDiff = qualityScores[b.estimatedQuality] - qualityScores[a.estimatedQuality];
      if (qualityDiff !== 0) return qualityDiff;
      
      // If quality is same, prefer more square images
      const aspectDiffA = Math.abs(1 - a.aspectRatio);
      const aspectDiffB = Math.abs(1 - b.aspectRatio);
      return aspectDiffA - aspectDiffB;
    });

    // Limit results
    const finalResults = processedImages.slice(0, maxResults);

    console.log(`[fetch-album-artwork] Found ${finalResults.length} images for "${albumName}" by "${artistName}"`);

    return new Response(JSON.stringify({
      success: true,
      message: `Found ${finalResults.length} artwork options for "${albumName}" by "${artistName}"`,
      images: finalResults,
      searchInfo: {
        albumName,
        artistName,
        releaseYear,
        queriesUsed: searchQueries,
        totalImagesFound: allResults.length,
        qualityBreakdown: finalResults.reduce((acc, img) => {
          acc[img.estimatedQuality] = (acc[img.estimatedQuality] || 0) + 1;
          return acc;
        }, {})
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (err) {
    console.error('[fetch-album-artwork] Error:', err);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: err?.message || 'Unknown error'
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}); 