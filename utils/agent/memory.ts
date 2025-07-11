import { ChatMessageType } from '../../data/types';

export interface ConversationMessage {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  message_type: string;
  timestamp: Date;
}

export interface ConversationSummary {
  summary: string;
  keyReferences: string[];
  userPreferences: string[];
  timestamp: Date;
}

export class ConversationMemoryManager {
  private messages: ConversationMessage[] = [];
  private summaries: ConversationSummary[] = [];
  private maxMessages: number = 20; // Keep last 20 messages for context
  private maxSummaries: number = 5; // Keep last 5 summaries
  private summaryThreshold: number = 15; // Summarize when we have 15+ messages

  /**
   * Add a message to short-term memory
   */
  addMessage(message: ChatMessageType): void {
    const conversationMessage: ConversationMessage = {
      id: message.id,
      content: message.content,
      sender: message.sender,
      message_type: message.type,
      timestamp: message.timestamp
    };

    this.messages.push(conversationMessage);

    // Keep only the last maxMessages
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }

    // Check if we should create a summary
    if (this.messages.length >= this.summaryThreshold && this.messages.length % 10 === 0) {
      console.log(`[MEMORY] Creating summary at ${this.messages.length} messages`);
      this.createSummary();
    }
  }

  /**
   * Create a summary of recent conversation
   */
  private createSummary(): void {
    if (this.messages.length < 10) return;

    // Get messages that haven't been summarized yet
    const recentMessages = this.messages.slice(-10);
    const summaryText = recentMessages.map(msg => {
      const role = msg.sender === 'user' ? 'User' : 'Assistant';
      return `${role}: ${msg.content}`;
    }).join('\n');

    // Extract key references and preferences
    const keyReferences = this.extractKeyReferences(summaryText);
    const userPreferences = this.extractUserPreferences(summaryText);

    const summary: ConversationSummary = {
      summary: this.generateSummaryText(summaryText),
      keyReferences,
      userPreferences,
      timestamp: new Date()
    };

    this.summaries.push(summary);

    // Keep only the last maxSummaries
    if (this.summaries.length > this.maxSummaries) {
      this.summaries = this.summaries.slice(-this.maxSummaries);
    }
  }

  /**
   * Extract key references (album names, artist names) from conversation
   */
  private extractKeyReferences(text: string): string[] {
    const references: string[] = [];
    
    // Look for album/artist patterns
    const albumPattern = /(?:album|record|vinyl)\s+(?:called\s+)?["']?([^"']+)["']?/gi;
    const artistPattern = /(?:by|artist|band)\s+["']?([^"']+)["']?/gi;
    
    let match;
    while ((match = albumPattern.exec(text)) !== null) {
      references.push(match[1].trim());
    }
    while ((match = artistPattern.exec(text)) !== null) {
      references.push(match[1].trim());
    }
    
    return Array.from(new Set(references)); // Remove duplicates
  }

  /**
   * Extract user preferences from conversation
   */
  private extractUserPreferences(text: string): string[] {
    const preferences: string[] = [];
    
    // Look for preference indicators
    const preferencePatterns = [
      /(?:like|love|enjoy|prefer)\s+([^.!?]+)/gi,
      /(?:favorite|favourite)\s+([^.!?]+)/gi,
      /(?:don't like|hate|dislike)\s+([^.!?]+)/gi
    ];
    
    preferencePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        preferences.push(match[1].trim());
      }
    });
    
    return Array.from(new Set(preferences)); // Remove duplicates
  }

  /**
   * Generate a concise summary text
   */
  private generateSummaryText(text: string): string {
    // Simple summarization - take key points
    const lines = text.split('\n');
    const userMessages = lines.filter(line => line.startsWith('User:'));
    const assistantMessages = lines.filter(line => line.startsWith('Assistant:'));
    
    const summary = [];
    if (userMessages.length > 0) {
      summary.push(`User discussed: ${userMessages.slice(-3).map(msg => msg.replace('User: ', '')).join(', ')}`);
    }
    if (assistantMessages.length > 0) {
      summary.push(`Assistant provided: ${assistantMessages.slice(-2).map(msg => msg.replace('Assistant: ', '')).join(', ')}`);
    }
    
    return summary.join('. ');
  }

  /**
   * Get recent conversation context for LLM prompt with intelligent truncation
   */
  getConversationContext(limit: number = 10, currentQuery?: string): string {
    if (this.messages.length === 0) {
      return '';
    }

    // If we have summaries and the conversation is long, use summaries + recent messages
    if (this.summaries.length > 0 && this.messages.length > 15) {
      console.log(`[MEMORY] Using ${this.summaries.length} summaries + ${limit} recent messages`);
      const recentMessages = this.messages.slice(-limit);
      const summaryContext = this.summaries
        .slice(-2) // Use last 2 summaries
        .map(summary => `Summary: ${summary.summary}`)
        .join('\n');
      
      const messageContext = recentMessages.map(msg => {
        const role = msg.sender === 'user' ? 'User' : 'Assistant';
        return `${role}: ${msg.content}`;
      }).join('\n');

      return `${summaryContext}\n\nRecent:\n${messageContext}`;
    }

    // Otherwise, use recent messages with relevance scoring
    const recentMessages = this.messages.slice(-limit);
    
    if (currentQuery) {
      // Score messages by relevance to current query
      const scoredMessages = recentMessages.map(msg => ({
        message: msg,
        relevance: this.calculateMessageRelevance(msg.content, currentQuery)
      })).sort((a, b) => b.relevance - a.relevance);

      // Take top relevant messages, but ensure we have at least 5
      const topMessages = scoredMessages.slice(0, Math.max(5, limit));
      const avgRelevance = scoredMessages.slice(0, 5).reduce((sum, item) => sum + item.relevance, 0) / 5;
      console.log(`[MEMORY] Relevance-based selection: ${topMessages.length} messages, avg relevance: ${avgRelevance.toFixed(2)}`);
      
      const contextLines = topMessages.map(({ message }) => {
        const role = message.sender === 'user' ? 'User' : 'Assistant';
        return `${role}: ${message.content}`;
      });

      return contextLines.join('\n');
    }

    // Fallback to simple recent messages
    const contextLines = recentMessages.map(msg => {
      const role = msg.sender === 'user' ? 'User' : 'Assistant';
      return `${role}: ${msg.content}`;
    });

    return contextLines.join('\n');
  }

  /**
   * Calculate relevance score between a message and current query
   */
  private calculateMessageRelevance(messageContent: string, query: string): number {
    const messageLower = messageContent.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Simple keyword overlap scoring
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    const matchingWords = queryWords.filter(word => messageLower.includes(word));
    
    return matchingWords.length / queryWords.length;
  }

  /**
   * Get conversation summary for long contexts
   */
  getConversationSummary(): string {
    if (this.summaries.length === 0) {
      return '';
    }

    const recentSummaries = this.summaries.slice(-3); // Last 3 summaries
    return recentSummaries.map(summary => summary.summary).join('. ');
  }

  /**
   * Get key references from conversation
   */
  getKeyReferences(): string[] {
    const allReferences: string[] = [];
    this.summaries.forEach(summary => {
      allReferences.push(...summary.keyReferences);
    });
    return Array.from(new Set(allReferences)); // Remove duplicates
  }

  /**
   * Get user preferences from conversation
   */
  getUserPreferences(): string[] {
    const allPreferences: string[] = [];
    this.summaries.forEach(summary => {
      allPreferences.push(...summary.userPreferences);
    });
    return Array.from(new Set(allPreferences)); // Remove duplicates
  }

  /**
   * Clear all messages and summaries (start fresh conversation)
   */
  clearMessages(): void {
    this.messages = [];
    this.summaries = [];
  }

  /**
   * Get the number of messages in memory
   */
  getMessageCount(): number {
    return this.messages.length;
  }

  /**
   * Get the number of summaries
   */
  getSummaryCount(): number {
    return this.summaries.length;
  }

  /**
   * Get all messages (for debugging)
   */
  getAllMessages(): ConversationMessage[] {
    return [...this.messages];
  }

  /**
   * Get all summaries (for debugging)
   */
  getAllSummaries(): ConversationSummary[] {
    return [...this.summaries];
  }
}

// Export a singleton instance
export const memoryManager = new ConversationMemoryManager(); 