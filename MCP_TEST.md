# MCP Integration Test Plan

## Overview

This document outlines the testing strategy for the Model Context Protocol (MCP) integration in the Vinyl Agent. The tests will validate that the MCP server and client work correctly and that the transition from custom tools to MCP-compliant tools is successful.

## Test Environment Setup

### Prerequisites
- Supabase project with Edge Functions deployed
- MCP server deployed at `/functions/v1/mcp-server`
- Updated chat-response function deployed
- Test vinyl collection data in database

### Environment Variables
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=your-openai-key
```

## Test Cases

### 1. MCP Server Tests

#### 1.1 Server Initialization
**Test**: Verify MCP server responds to initialization requests
```bash
curl -X POST https://your-project.supabase.co/functions/v1/mcp-server \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test-1",
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {
        "tools": {},
        "resources": {
          "listChanged": false
        }
      },
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
```

**Expected Result**: 
```json
{
  "jsonrpc": "2.0",
  "id": "test-1",
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {},
      "resources": {
        "listChanged": false
      }
    },
    "serverInfo": {
      "name": "vinyl-collection-mcp-server",
      "version": "1.0.0"
    }
  }
}
```

#### 1.2 Tool Discovery
**Test**: Verify MCP server returns available tools
```bash
curl -X POST https://your-project.supabase.co/functions/v1/mcp-server \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test-2",
    "method": "tools/list"
  }'
```

**Expected Result**: 
```json
{
  "jsonrpc": "2.0",
  "id": "test-2",
  "result": {
    "tools": [
      {
        "name": "vinyl_collection_query",
        "description": "Query the user's vinyl collection for albums by artist, album name, or both",
        "inputSchema": {
          "type": "object",
          "properties": {
            "albumName": {
              "type": "string",
              "description": "Album name to search for (optional)"
            },
            "artistName": {
              "type": "string",
              "description": "Artist name to search for (optional)"
            }
          }
        }
      },
      {
        "name": "vinyl_add_album",
        "description": "Add a new album to the user's vinyl collection",
        "inputSchema": {
          "type": "object",
          "properties": {
            "albumName": {
              "type": "string",
              "description": "Album name (required)"
            },
            "artistName": {
              "type": "string",
              "description": "Artist name (required)"
            }
          },
          "required": ["albumName", "artistName"]
        }
      },
      {
        "name": "vinyl_remove_album",
        "description": "Remove an album from the user's vinyl collection",
        "inputSchema": {
          "type": "object",
          "properties": {
            "albumId": {
              "type": "number",
              "description": "Album ID (optional)"
            },
            "albumName": {
              "type": "string",
              "description": "Album name (optional)"
            },
            "artistName": {
              "type": "string",
              "description": "Artist name (optional)"
            }
          }
        }
      }
    ]
  }
}
```

#### 1.3 Tool Execution - Collection Query
**Test**: Verify vinyl_collection_query tool works
```bash
curl -X POST https://your-project.supabase.co/functions/v1/mcp-server \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test-3",
    "method": "tools/call",
    "params": {
      "name": "vinyl_collection_query",
      "arguments": {
        "albumName": "Dark Side of the Moon",
        "artistName": "Pink Floyd"
      }
    }
  }'
```

**Expected Result**: 
```json
{
  "jsonrpc": "2.0",
  "id": "test-3",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"found\":true,\"albums\":[{\"id\":1,\"title\":\"Dark Side of the Moon\",\"artist_name\":\"Pink Floyd\"}]}"
      }
    ]
  }
}
```

### 2. MCP Client Tests

#### 2.1 Client Initialization
**Test**: Verify MCP client can connect to server
```javascript
import { createVinylMCPClient } from './utils/mcp/client';

const client = createVinylMCPClient();
await client.initialize(authToken);
console.log('Client initialized successfully');
```

#### 2.2 Tool Discovery
**Test**: Verify client can discover tools
```javascript
const tools = await client.discoverTools(authToken);
console.log('Discovered tools:', tools.map(t => t.name));
// Should output: ["vinyl_collection_query", "vinyl_add_album", "vinyl_remove_album"]
```

#### 2.3 Tool Execution
**Test**: Verify client can execute tools
```javascript
const result = await client.executeTool('vinyl_collection_query', {
  albumName: 'Dark Side of the Moon',
  artistName: 'Pink Floyd'
}, authToken);
console.log('Tool result:', result);
```

### 3. Chat Response Integration Tests

#### 3.1 Single Tool Call
**Test**: Verify chat-response uses MCP client for single tool calls
```bash
curl -X POST https://your-project.supabase.co/functions/v1/chat-response \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "message": "Do I have Dark Side of the Moon by Pink Floyd?"
  }'
```

**Expected Result**: 
```json
{
  "message": "✅ Yes! You have \"Dark Side of the Moon\" by Pink Floyd",
  "timestamp": "2024-01-01T00:00:00Z",
  "type": "collection_query",
  "data": {
    "found": true,
    "albums": [...]
  }
}
```

#### 3.2 Multi-Step Operations
**Test**: Verify chat-response uses MCP client for multi-step operations
```bash
curl -X POST https://your-project.supabase.co/functions/v1/chat-response \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "message": "Do I have these albums: Dark Side of the Moon, Abbey Road?"
  }'
```

**Expected Result**: 
```json
{
  "message": "✅ Completed Check collection status for multiple albums\n\n**Successful operations:**\n• \"Dark Side of the Moon\" by Pink Floyd\n• \"Abbey Road\" by The Beatles",
  "timestamp": "2024-01-01T00:00:00Z",
  "type": "multi_step_success",
  "data": {
    "completed": 2,
    "total": 2,
    "results": [...]
  }
}
```

### 4. Error Handling Tests

#### 4.1 Invalid Tool Name
**Test**: Verify proper error handling for invalid tool names
```bash
curl -X POST https://your-project.supabase.co/functions/v1/mcp-server \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test-error",
    "method": "tools/call",
    "params": {
      "name": "invalid_tool",
      "arguments": {}
    }
  }'
```

**Expected Result**: 
```json
{
  "jsonrpc": "2.0",
  "id": "test-error",
  "error": {
    "code": -32601,
    "message": "Tool 'invalid_tool' not found"
  }
}
```

#### 4.2 Invalid Parameters
**Test**: Verify parameter validation works
```bash
curl -X POST https://your-project.supabase.co/functions/v1/mcp-server \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test-params",
    "method": "tools/call",
    "params": {
      "name": "vinyl_add_album",
      "arguments": {
        "albumName": "Test Album"
        // Missing required artistName
      }
    }
  }'
```

**Expected Result**: Error response indicating missing required parameter

### 5. Performance Tests

#### 5.1 Response Time
**Test**: Measure response time for MCP tool calls
```javascript
const startTime = Date.now();
const result = await client.executeTool('vinyl_collection_query', {
  albumName: 'Test Album'
}, authToken);
const endTime = Date.now();
console.log(`Response time: ${endTime - startTime}ms`);
```

**Expected Result**: Response time should be < 1000ms for simple queries

#### 5.2 Concurrent Requests
**Test**: Verify system handles concurrent MCP requests
```javascript
const promises = Array(10).fill().map(() => 
  client.executeTool('vinyl_collection_query', {
    albumName: 'Test Album'
  }, authToken)
);
const results = await Promise.all(promises);
console.log(`Completed ${results.length} concurrent requests`);
```

**Expected Result**: All requests should complete successfully

### 6. Frontend Integration Tests

#### 6.1 Chat Interface
**Test**: Verify chat interface works with MCP backend
1. Open chat interface
2. Send message: "Do I have Dark Side of the Moon by Pink Floyd?"
3. Verify response appears correctly
4. Check that loading states work properly

#### 6.2 Error Handling
**Test**: Verify frontend handles MCP errors gracefully
1. Send invalid request
2. Verify error message is displayed
3. Check that retry functionality works

## Test Execution

### Automated Tests
```bash
# Run MCP server tests
npm run test:mcp-server

# Run MCP client tests
npm run test:mcp-client

# Run integration tests
npm run test:integration
```

### Manual Tests
1. Deploy MCP server and updated chat-response
2. Run through test cases manually
3. Verify all functionality works as expected
4. Document any issues found

## Success Criteria

### Functional Requirements
- [ ] All existing tools work through MCP interface
- [ ] Tool discovery returns correct tool schemas
- [ ] Tool execution produces expected results
- [ ] Multi-step operations work correctly
- [ ] Error handling is robust

### Performance Requirements
- [ ] Response time is within 10% of previous system
- [ ] System handles concurrent requests
- [ ] Memory usage is reasonable
- [ ] No memory leaks

### Quality Requirements
- [ ] All tests pass
- [ ] Error messages are clear and helpful
- [ ] Logging provides useful debugging information
- [ ] Code follows best practices

## Rollback Plan

If issues are found during testing:

1. **Immediate Rollback**: Revert to previous chat-response version
2. **Investigation**: Debug MCP integration issues
3. **Fix and Retest**: Address issues and run tests again
4. **Gradual Rollout**: Deploy to staging first, then production

## Documentation

After successful testing:

1. Update API documentation
2. Create MCP integration guide
3. Document any configuration changes
4. Update deployment instructions 