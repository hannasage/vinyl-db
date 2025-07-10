import { ChatMessageType } from '../../data/types';
import { createClient } from '../supabase/client';

// Database interfaces
export interface ConversationSession {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  isActive: boolean;
}

export interface ConversationMessage {
  id: string;
  sessionId: string;
  content: string;
  sender: 'user' | 'agent';
  messageType: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  sequenceNumber: number;
}

export interface ConversationEmbedding {
  id: string;
  sessionId: string;
  embedding: number[];
  createdAt: Date;
}

export interface ConversationFeedback {
  id: string;
  sessionId: string;
  userId: string;
  feedbackType: 'thumbs_up' | 'thumbs_down';
  createdAt: Date;
}

export interface ExemplarConversation {
  id: string;
  sessionId: string;
  userId: string;
  exemplarType: 'positive' | 'negative';
  title: string;
  description?: string;
  tags: string[];
  createdAt: Date;
  usageCount: number;
  lastUsed?: Date;
  isActive: boolean;
}

// Short-term memory interface (for backward compatibility)
export interface ShortTermMessage {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  message_type: string;
  timestamp: Date;
}

export class EnhancedMemoryManager {
  private shortTermMessages: ShortTermMessage[] = [];
  private maxShortTermMessages: number = 20;
  private currentSessionId: string | null = null;
  private supabase = createClient();

  // Short-term Memory Functions

  /**
   * Add a message to short-term memory
   */
  addShortTermMessage(message: ChatMessageType): void {
    const shortTermMessage: ShortTermMessage = {
      id: message.id,
      content: message.content,
      sender: message.sender,
      message_type: message.type,
      timestamp: message.timestamp
    };

    this.shortTermMessages.push(shortTermMessage);

    // Keep only the last maxShortTermMessages
    if (this.shortTermMessages.length > this.maxShortTermMessages) {
      this.shortTermMessages = this.shortTermMessages.slice(-this.maxShortTermMessages);
    }
  }

  /**
   * Get recent conversation context for AI prompts
   */
  getShortTermContext(limit: number = 10): string {
    if (this.shortTermMessages.length === 0) {
      return '';
    }

    // Get the last N messages
    const recentMessages = this.shortTermMessages.slice(-limit);
    
    const contextLines = recentMessages.map(msg => {
      const role = msg.sender === 'user' ? 'User' : 'Assistant';
      return `${role}: ${msg.content}`;
    });

    return contextLines.join('\n');
  }

  /**
   * Clear short-term memory (start fresh conversation)
   */
  clearShortTermMemory(): void {
    this.shortTermMessages = [];
  }

  /**
   * Get the number of messages in short-term memory
   */
  getShortTermMessageCount(): number {
    return this.shortTermMessages.length;
  }

  // Long-term Memory Functions

  /**
   * Create a new conversation session
   */
  async createSession(title?: string): Promise<string> {
    try {
      // Get the current user
      const { data: userData, error: userError } = await this.supabase.auth.getUser();
      if (userError || !userData?.user) {
        throw new Error('User not authenticated');
      }
      const user_id = userData.user.id;
      const { data, error } = await this.supabase
        .from('conversation_sessions')
        .insert({
          user_id,
          title: title || null,
          message_count: 0,
          is_active: true
        })
        .select('id')
        .single();

      if (error) throw error;

      this.currentSessionId = data.id;
      return data.id;
    } catch (error) {
      console.error('Error creating conversation session:', error);
      throw error;
    }
  }

  /**
   * Save a message to the database
   */
  async saveMessage(
    content: string,
    sender: 'user' | 'agent',
    messageType: string = 'text',
    metadata?: Record<string, any>
  ): Promise<string> {
    if (!this.currentSessionId) {
      throw new Error('No active session. Call createSession() first.');
    }

    try {
      // Get the next sequence number
      const { data: lastMessage } = await this.supabase
        .from('conversation_messages')
        .select('sequence_number')
        .eq('session_id', this.currentSessionId)
        .order('sequence_number', { ascending: false })
        .limit(1)
        .single();

      const sequenceNumber = (lastMessage?.sequence_number || 0) + 1;

      const { data, error } = await this.supabase
        .from('conversation_messages')
        .insert({
          session_id: this.currentSessionId,
          content,
          sender,
          message_type: messageType,
          metadata: metadata || {},
          sequence_number: sequenceNumber
        })
        .select('id')
        .single();

      if (error) throw error;

      return data.id;
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }

  /**
   * Get messages from a specific session
   */
  async getSessionMessages(sessionId: string): Promise<ConversationMessage[]> {
    try {
      const { data, error } = await this.supabase
        .from('conversation_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('sequence_number', { ascending: true });

      if (error) throw error;

      return data.map((msg: any) => ({
        id: msg.id,
        sessionId: msg.session_id,
        content: msg.content,
        sender: msg.sender,
        messageType: msg.message_type,
        timestamp: new Date(msg.timestamp),
        metadata: msg.metadata,
        sequenceNumber: msg.sequence_number
      }));
    } catch (error) {
      console.error('Error getting session messages:', error);
      throw error;
    }
  }

  /**
   * Search for similar conversations using semantic search
   */
  async searchSimilarConversations(
    query: string,
    limit: number = 5
  ): Promise<ConversationSession[]> {
    try {
      // For now, we'll do a simple text search
      // TODO: Implement proper vector similarity search when embeddings are available
      const { data, error } = await this.supabase
        .from('conversation_sessions')
        .select(`
          id,
          title,
          created_at,
          updated_at,
          message_count,
          is_active
        `)
        .eq('is_active', true)
        .ilike('title', `%${query}%`)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map((session: any) => ({
        id: session.id,
        title: session.title,
        createdAt: new Date(session.created_at),
        updatedAt: new Date(session.updated_at),
        messageCount: session.message_count,
        isActive: session.is_active
      }));
    } catch (error) {
      console.error('Error searching conversations:', error);
      throw error;
    }
  }

  /**
   * Get user's recent conversation sessions
   */
  async getRecentSessions(limit: number = 10): Promise<ConversationSession[]> {
    try {
      const { data, error } = await this.supabase
        .from('conversation_sessions')
        .select(`
          id,
          title,
          created_at,
          updated_at,
          message_count,
          is_active
        `)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map((session: any) => ({
        id: session.id,
        title: session.title,
        createdAt: new Date(session.created_at),
        updatedAt: new Date(session.updated_at),
        messageCount: session.message_count,
        isActive: session.is_active
      }));
    } catch (error) {
      console.error('Error getting recent sessions:', error);
      throw error;
    }
  }

  /**
   * Update session title
   */
  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('conversation_sessions')
        .update({ title })
        .eq('id', sessionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating session title:', error);
      throw error;
    }
  }

  /**
   * Archive a conversation session (mark as inactive)
   */
  async archiveSession(sessionId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('conversation_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error archiving session:', error);
      throw error;
    }
  }

  /**
   * Delete a conversation session and all its messages
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      // Delete all messages in the session first (cascade should handle this, but being explicit)
      const { error: messagesError } = await this.supabase
        .from('conversation_messages')
        .delete()
        .eq('session_id', sessionId);

      if (messagesError) throw messagesError;

      // Delete all embeddings for the session
      const { error: embeddingsError } = await this.supabase
        .from('conversation_embeddings')
        .delete()
        .eq('session_id', sessionId);

      if (embeddingsError) throw embeddingsError;

      // Delete all feedback for the session
      const { error: feedbackError } = await this.supabase
        .from('conversation_feedback')
        .delete()
        .eq('session_id', sessionId);

      if (feedbackError) throw feedbackError;

      // Delete the session itself
      const { error: sessionError } = await this.supabase
        .from('conversation_sessions')
        .delete()
        .eq('id', sessionId);

      if (sessionError) throw sessionError;

      // If this was the current session, clear it
      if (this.currentSessionId === sessionId) {
        this.currentSessionId = null;
        this.clearShortTermMemory();
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }

  /**
   * Set the current active session
   */
  setCurrentSession(sessionId: string): void {
    this.currentSessionId = sessionId;
  }

  /**
   * Get the current active session ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Load messages from a session into short-term memory
   */
  async loadSessionIntoMemory(sessionId: string, limit: number = 20): Promise<void> {
    try {
      const messages = await this.getSessionMessages(sessionId);
      const recentMessages = messages.slice(-limit);

      this.shortTermMessages = recentMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender,
        message_type: msg.messageType,
        timestamp: msg.timestamp
      }));

      this.currentSessionId = sessionId;
    } catch (error) {
      console.error('Error loading session into memory:', error);
      throw error;
    }
  }

  /**
   * Get a conversation session by ID
   */
  async getSessionById(sessionId: string): Promise<ConversationSession | null> {
    try {
      const { data, error } = await this.supabase
        .from('conversation_sessions')
        .select('id, title, created_at, updated_at, message_count, is_active')
        .eq('id', sessionId)
        .single();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        title: data.title,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        messageCount: data.message_count,
        isActive: data.is_active
      };
    } catch (error) {
      console.error('Error fetching session by ID:', error);
      return null;
    }
  }

  // Feedback Functions

  /**
   * Save feedback for a conversation session and optionally create exemplar
   */
  async saveFeedback(
    sessionId: string,
    feedbackType: 'thumbs_up' | 'thumbs_down',
    createExemplar: boolean = true
  ): Promise<string> {
    try {
      // Check if feedback already exists for this session
      const existingFeedback = await this.getSessionFeedback(sessionId);
      
      if (existingFeedback) {
        // Update existing feedback
        const { data, error } = await this.supabase
          .from('conversation_feedback')
          .update({ feedback_type: feedbackType })
          .eq('session_id', sessionId)
          .select('id')
          .single();

        if (error) throw error;
        return data.id;
      } else {
        // Create new feedback
        const { data, error } = await this.supabase
          .from('conversation_feedback')
          .insert({
            session_id: sessionId,
            feedback_type: feedbackType
          })
          .select('id')
          .single();

        if (error) throw error;

        // Create exemplar if requested and this is new feedback
        if (createExemplar) {
          try {
            const exemplarType = feedbackType === 'thumbs_up' ? 'positive' : 'negative';
            const title = `${exemplarType === 'positive' ? 'Helpful' : 'Unhelpful'} Conversation`;
            await this.createExemplar(sessionId, exemplarType, title);
          } catch (exemplarError) {
            console.error('Error creating exemplar:', exemplarError);
            // Don't throw here - feedback was saved successfully
          }
        }

        return data.id;
      }
    } catch (error) {
      console.error('Error saving feedback:', error);
      throw error;
    }
  }

  /**
   * Get feedback for a session
   */
  async getSessionFeedback(sessionId: string): Promise<ConversationFeedback | null> {
    try {
      const { data, error } = await this.supabase
        .from('conversation_feedback')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

      if (!data) return null;

      return {
        id: data.id,
        sessionId: data.session_id,
        userId: data.user_id,
        feedbackType: data.feedback_type,
        createdAt: new Date(data.created_at)
      };
    } catch (error) {
      console.error('Error getting session feedback:', error);
      throw error;
    }
  }

  // Exemplar Functions

  /**
   * Create an exemplar conversation from a session
   */
  async createExemplar(
    sessionId: string,
    exemplarType: 'positive' | 'negative',
    title: string,
    description?: string,
    tags: string[] = []
  ): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('exemplar_conversations')
        .insert({
          session_id: sessionId,
          exemplar_type: exemplarType,
          title,
          description,
          tags,
          usage_count: 0,
          is_active: true
        })
        .select('id')
        .single();

      if (error) throw error;

      return data.id;
    } catch (error) {
      console.error('Error creating exemplar:', error);
      throw error;
    }
  }

  /**
   * Get exemplar conversations
   */
  async getExemplars(
    exemplarType?: 'positive' | 'negative',
    limit: number = 10
  ): Promise<ExemplarConversation[]> {
    try {
      let query = this.supabase
        .from('exemplar_conversations')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (exemplarType) {
        query = query.eq('exemplar_type', exemplarType);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map((exemplar: any) => ({
        id: exemplar.id,
        sessionId: exemplar.session_id,
        userId: exemplar.user_id,
        exemplarType: exemplar.exemplar_type,
        title: exemplar.title,
        description: exemplar.description,
        tags: exemplar.tags || [],
        createdAt: new Date(exemplar.created_at),
        usageCount: exemplar.usage_count,
        lastUsed: exemplar.last_used ? new Date(exemplar.last_used) : undefined,
        isActive: exemplar.is_active
      }));
    } catch (error) {
      console.error('Error getting exemplars:', error);
      throw error;
    }
  }

  /**
   * Update exemplar usage count
   */
  async updateExemplarUsage(exemplarId: string): Promise<void> {
    try {
      // Fetch current usage_count
      const { data: exemplar, error: fetchError } = await this.supabase
        .from('exemplar_conversations')
        .select('usage_count')
        .eq('id', exemplarId)
        .single();
      if (fetchError) throw fetchError;
      const newCount = (exemplar?.usage_count || 0) + 1;
      const { error } = await this.supabase
        .from('exemplar_conversations')
        .update({
          usage_count: newCount,
          last_used: new Date().toISOString()
        })
        .eq('id', exemplarId);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating exemplar usage:', error);
      throw error;
    }
  }

  /**
   * Update exemplar metadata
   */
  async updateExemplar(
    exemplarId: string,
    updates: {
      title?: string;
      description?: string;
      tags?: string[];
    }
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('exemplar_conversations')
        .update(updates)
        .eq('id', exemplarId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating exemplar:', error);
      throw error;
    }
  }

  /**
   * Delete exemplar (mark as inactive)
   */
  async deleteExemplar(exemplarId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('exemplar_conversations')
        .update({ is_active: false })
        .eq('id', exemplarId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting exemplar:', error);
      throw error;
    }
  }

  // Utility Functions

  /**
   * Get all short-term messages (for debugging)
   */
  getAllShortTermMessages(): ShortTermMessage[] {
    return [...this.shortTermMessages];
  }

  /**
   * Auto-generate a title for a session based on its messages
   */
  async generateSessionTitle(sessionId: string): Promise<string> {
    try {
      const messages = await this.getSessionMessages(sessionId);
      const userMessages = messages.filter(msg => msg.sender === 'user').slice(0, 3);
      
      if (userMessages.length === 0) {
        return 'New Conversation';
      }

      // Use the first user message as title (truncated)
      const firstMessage = userMessages[0].content;
      const title = firstMessage.length > 50 
        ? firstMessage.substring(0, 50) + '...'
        : firstMessage;

      return title;
    } catch (error) {
      console.error('Error generating session title:', error);
      return 'New Conversation';
    }
  }
}

// Export a singleton instance
export const enhancedMemoryManager = new EnhancedMemoryManager();

// Export the old interface for backward compatibility
export class ConversationMemoryManager {
  private messages: ShortTermMessage[] = [];
  private maxMessages: number = 20;

  addMessage(message: ChatMessageType): void {
    enhancedMemoryManager.addShortTermMessage(message);
  }

  getConversationContext(limit: number = 10): string {
    return enhancedMemoryManager.getShortTermContext(limit);
  }

  clearMessages(): void {
    enhancedMemoryManager.clearShortTermMemory();
  }

  getMessageCount(): number {
    return enhancedMemoryManager.getShortTermMessageCount();
  }

  getAllMessages(): ShortTermMessage[] {
    return enhancedMemoryManager.getAllShortTermMessages();
  }
}

// Export the old singleton for backward compatibility
export const memoryManager = new ConversationMemoryManager(); 