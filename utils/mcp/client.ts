// MCP Client for connecting to MCP servers
import { createClient } from '../supabase/client';

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

export interface MCPToolResult {
  content: Array<{
    type: string;
    text: string;
  }>;
}

// MCP Client Configuration
export interface MCPClientConfig {
  serverUrl: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

// MCP Client Class
export class MCPClient {
  private config: MCPClientConfig;
  private requestId = 0;
  private tools: MCPTool[] = [];
  private initialized = false;

  constructor(config: MCPClientConfig) {
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };
  }

  // Generate unique request ID
  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestId}`;
  }

  // Make HTTP request to MCP server
  private async makeRequest(request: MCPRequest, authToken?: string): Promise<MCPResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(this.config.serverUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: MCPResponse = await response.json();
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // Retry logic with exponential backoff
  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = this.config.maxRetries!
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        // Wait before retry with exponential backoff
        const delay = this.config.retryDelay! * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  // Initialize connection to MCP server
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

    const response = await this.retryRequest(() => this.makeRequest(request, authToken));
    
    if (response.error) {
      throw new Error(`MCP initialization failed: ${response.error.message}`);
    }

    console.log('[MCP Client] Successfully initialized MCP connection');
    this.initialized = true;
  }

  // Discover available tools
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

    const response = await this.retryRequest(() => this.makeRequest(request, authToken));
    
    if (response.error) {
      throw new Error(`Tool discovery failed: ${response.error.message}`);
    }

    this.tools = response.result?.tools || [];
    console.log('[MCP Client] Discovered tools:', this.tools.map(t => t.name));
    
    return this.tools;
  }

  // Call a tool
  async callTool(toolCall: MCPToolCall, authToken?: string): Promise<MCPToolResult> {
    if (!this.initialized) {
      await this.initialize(authToken);
    }

    console.log('[MCP Client] Calling tool:', toolCall.name, 'with args:', toolCall.arguments);
    
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: this.generateRequestId(),
      method: 'tools/call',
      params: {
        name: toolCall.name,
        arguments: toolCall.arguments
      }
    };

    const response = await this.retryRequest(() => this.makeRequest(request, authToken));
    
    if (response.error) {
      throw new Error(`Tool call failed: ${response.error.message}`);
    }

    const result = response.result as MCPToolResult;
    console.log('[MCP Client] Tool call successful:', toolCall.name);
    
    return result;
  }

  // Get cached tools (if already discovered)
  getCachedTools(): MCPTool[] {
    return [...this.tools];
  }

  // Check if tool exists
  hasTool(toolName: string): boolean {
    return this.tools.some(tool => tool.name === toolName);
  }

  // Get tool schema
  getToolSchema(toolName: string): MCPTool | undefined {
    return this.tools.find(tool => tool.name === toolName);
  }

  // Validate tool parameters against schema
  validateToolParameters(toolName: string, parameters: Record<string, any>): boolean {
    const tool = this.getToolSchema(toolName);
    if (!tool) {
      return false;
    }

    const schema = tool.inputSchema;
    
    // Check required fields
    if (schema.required) {
      for (const requiredField of schema.required) {
        if (!(requiredField in parameters)) {
          console.error(`[MCP Client] Missing required field: ${requiredField}`);
          return false;
        }
      }
    }

    // Check field types (basic validation)
    for (const [fieldName, fieldValue] of Object.entries(parameters)) {
      const fieldSchema = schema.properties[fieldName];
      if (fieldSchema) {
        const expectedType = fieldSchema.type;
        const actualType = typeof fieldValue;
        
        if (expectedType === 'string' && actualType !== 'string') {
          console.error(`[MCP Client] Field ${fieldName} should be string, got ${actualType}`);
          return false;
        }
        
        if (expectedType === 'number' && actualType !== 'number') {
          console.error(`[MCP Client] Field ${fieldName} should be number, got ${actualType}`);
          return false;
        }
        
        if (expectedType === 'boolean' && actualType !== 'boolean') {
          console.error(`[MCP Client] Field ${fieldName} should be boolean, got ${actualType}`);
          return false;
        }
      }
    }

    return true;
  }

  // Execute tool with validation
  async executeTool(toolName: string, parameters: Record<string, any>, authToken?: string): Promise<any> {
    // Validate tool exists
    if (!this.hasTool(toolName)) {
      throw new Error(`Tool '${toolName}' not found`);
    }

    // Validate parameters
    if (!this.validateToolParameters(toolName, parameters)) {
      throw new Error(`Invalid parameters for tool '${toolName}'`);
    }

    // Call tool
    const result = await this.callTool({
      name: toolName,
      arguments: parameters
    }, authToken);

    // Parse result
    try {
      const textContent = result.content.find(c => c.type === 'text');
      if (textContent) {
        return JSON.parse(textContent.text);
      }
      return result;
    } catch (error) {
      console.warn('[MCP Client] Failed to parse tool result as JSON, returning raw result');
      return result;
    }
  }

  // Batch tool execution
  async executeBatchTools(toolCalls: MCPToolCall[], authToken?: string): Promise<Array<{ tool: string; result: any; error?: string }>> {
    const results = [];
    
    for (const toolCall of toolCalls) {
      try {
        const result = await this.executeTool(toolCall.name, toolCall.arguments, authToken);
        results.push({
          tool: toolCall.name,
          result
        });
      } catch (error) {
        results.push({
          tool: toolCall.name,
          result: null,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return results;
  }

  // Health check
  async healthCheck(authToken?: string): Promise<boolean> {
    try {
      await this.initialize(authToken);
      return true;
    } catch (error) {
      console.error('[MCP Client] Health check failed:', error);
      return false;
    }
  }
}

// Factory function to create MCP client
export function createMCPClient(config: MCPClientConfig): MCPClient {
  return new MCPClient(config);
}

// Default MCP client instance for vinyl collection
export function createVinylMCPClient(): MCPClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  const mcpServerUrl = `${supabaseUrl}/functions/v1/mcp-server`;
  
  return createMCPClient({
    serverUrl: mcpServerUrl,
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000
  });
} 