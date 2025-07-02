import { ChatMessageType } from '../../data/types';

export interface ConversationMessage {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  message_type: string;
  timestamp: Date;
}

export class ConversationMemoryManager {
  private messages: ConversationMessage[] = [];
  private maxMessages: number = 20; // Keep last 20 messages for context

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
  }

  /**
   * Get recent conversation context for LLM prompt
   */
  getConversationContext(limit: number = 10): string {
    if (this.messages.length === 0) {
      return '';
    }

    // Get the last N messages
    const recentMessages = this.messages.slice(-limit);
    
    const contextLines = recentMessages.map(msg => {
      const role = msg.sender === 'user' ? 'User' : 'Assistant';
      return `${role}: ${msg.content}`;
    });

    return contextLines.join('\n');
  }

  /**
   * Clear all messages (start fresh conversation)
   */
  clearMessages(): void {
    this.messages = [];
  }

  /**
   * Get the number of messages in memory
   */
  getMessageCount(): number {
    return this.messages.length;
  }

  /**
   * Get all messages (for debugging)
   */
  getAllMessages(): ConversationMessage[] {
    return [...this.messages];
  }

  /**
   * Test the memory system (for debugging)
   */
  testMemory(): { messageCount: number; context: string; messages: ConversationMessage[] } {
    return {
      messageCount: this.getMessageCount(),
      context: this.getConversationContext(),
      messages: this.getAllMessages()
    };
  }
}

// Export a singleton instance
export const memoryManager = new ConversationMemoryManager(); 