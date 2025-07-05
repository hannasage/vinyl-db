// Shared MCP Types and Utilities for Supabase Edge Functions

// MCP Protocol Types
export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

// MCP Client Class for Edge Functions
export class MCPClient {
  private serverUrl: string;
  private requestId = 0;
  private tools: MCPTool[] = [];
  private initialized = false;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestId}`;
  }

  private async makeRequest(request: any, authToken?: string): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(this.serverUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  async initialize(authToken?: string): Promise<void> {
    console.log('[MCP Client] Initializing connection to MCP server');
    
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: this.generateRequestId(),
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {
            listChanged: false
          }
        },
        clientInfo: {
          name: 'vinyl-agent-mcp-client',
          version: '1.0.0'
        }
      }
    };

    const response = await this.makeRequest(request, authToken);
    
    if (response.error) {
      throw new Error(`MCP initialization failed: ${response.error.message}`);
    }

    console.log('[MCP Client] Successfully initialized MCP connection');
    this.initialized = true;
  }

  async discoverTools(authToken?: string): Promise<MCPTool[]> {
    if (!this.initialized) {
      await this.initialize(authToken);
    }

    console.log('[MCP Client] Discovering available tools');
    
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: this.generateRequestId(),
      method: 'tools/list'
    };

    const response = await this.makeRequest(request, authToken);
    
    if (response.error) {
      throw new Error(`Tool discovery failed: ${response.error.message}`);
    }

    this.tools = response.result?.tools || [];
    console.log('[MCP Client] Discovered tools:', this.tools.map(t => t.name));
    
    return this.tools;
  }

  async executeTool(toolName: string, parameters: Record<string, any>, authToken?: string): Promise<any> {
    if (!this.initialized) {
      await this.initialize(authToken);
    }

    console.log('[MCP Client] Calling tool:', toolName, 'with args:', parameters);
    
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: this.generateRequestId(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: parameters
      }
    };

    const response = await this.makeRequest(request, authToken);
    
    if (response.error) {
      throw new Error(`Tool call failed: ${response.error.message}`);
    }

    const result = response.result;
    console.log('[MCP Client] Tool call successful:', toolName);
    
    // Parse result
    try {
      const textContent = result.content.find((c: any) => c.type === 'text');
      if (textContent) {
        return JSON.parse(textContent.text);
      }
      return result;
    } catch (error) {
      console.warn('[MCP Client] Failed to parse tool result as JSON, returning raw result');
      return result;
    }
  }

  getCachedTools(): MCPTool[] {
    return [...this.tools];
  }

  hasTool(toolName: string): boolean {
    return this.tools.some(tool => tool.name === toolName);
  }
}

// Utility function to create MCP client with default configuration
export function createMCPClient(supabaseUrl: string): MCPClient {
  const mcpServerUrl = `${supabaseUrl}/functions/v1/mcp-server`;
  return new MCPClient(mcpServerUrl);
} 