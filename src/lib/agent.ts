import { dbAll, dbGet, dbRun } from "./db";
import { getProvider, ChatMessage, AIResponse } from "./ai-providers";
import { retrieveContext, formatContext } from "./rag";
import { v4 as uuidv4 } from "uuid";

export interface Agent {
  id: string;
  name: string;
  description: string;
  avatar: string | null;
  system_prompt: string;
  personality: string | null;
  ai_provider: string;
  ai_model: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  metadata: string | null;
  created_at: string;
}

/**
 * OpenClaw Agent Framework
 * Handles agent execution with:
 * - Document-based context (RAG)
 * - Conversation memory
 * - Tool awareness (extensible)
 * - Multi-provider AI support
 */
export class OpenClawAgent {
  private agent: Agent;
  private conversationId: string;

  constructor(agent: Agent, conversationId?: string) {
    this.agent = agent;
    this.conversationId = conversationId || uuidv4();
  }

  /**
   * Process a user message and generate a response.
   */
  async chat(userMessage: string, visitorId?: string): Promise<{ response: string; conversationId: string }> {
    // Ensure conversation exists
    const existing = await dbGet("SELECT id FROM conversations WHERE id = ?", [this.conversationId]);

    if (!existing) {
      await dbRun(
        "INSERT INTO conversations (id, agent_id, visitor_id, title) VALUES (?, ?, ?, ?)",
        [this.conversationId, this.agent.id, visitorId || null, userMessage.slice(0, 100)]
      );
    }

    // Save user message
    const userMsgId = uuidv4();
    await dbRun(
      "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)",
      [userMsgId, this.conversationId, "user", userMessage]
    );

    // Retrieve relevant documents
    const contextChunks = await retrieveContext(this.agent.id, userMessage);
    const documentContext = formatContext(contextChunks);

    // Build conversation history
    const history = await dbAll(
      "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
      [this.conversationId]
    ) as { role: string; content: string }[];

    // Build the system prompt with document context
    let systemPrompt = this.agent.system_prompt;
    if (this.agent.personality) {
      systemPrompt += `\n\nYour personality: ${this.agent.personality}`;
    }
    if (documentContext) {
      systemPrompt += documentContext;
      systemPrompt +=
        "\nUse the above documents to answer questions about the site owner. " +
        "Synthesize information naturally — don't just quote documents verbatim.";
    }

    // Build messages array
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // Call AI provider
    const provider = getProvider(this.agent.ai_provider);
    const aiResponse: AIResponse = await provider.chat(messages, {
      model: this.agent.ai_model || undefined,
      maxTokens: 1024,
    });

    // Save assistant response
    const assistantMsgId = uuidv4();
    await dbRun(
      "INSERT INTO messages (id, conversation_id, role, content, metadata) VALUES (?, ?, ?, ?, ?)",
      [
        assistantMsgId,
        this.conversationId,
        "assistant",
        aiResponse.content,
        JSON.stringify({ provider: aiResponse.provider, model: aiResponse.model, usage: aiResponse.usage }),
      ]
    );

    // Update conversation timestamp
    await dbRun("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?", [this.conversationId]);

    // Log analytics
    await dbRun(
      "INSERT INTO analytics (id, event_type, agent_id, conversation_id, visitor_id, metadata) VALUES (?, ?, ?, ?, ?, ?)",
      [
        uuidv4(),
        "message",
        this.agent.id,
        this.conversationId,
        visitorId || null,
        JSON.stringify({
          input_tokens: aiResponse.usage?.input_tokens,
          output_tokens: aiResponse.usage?.output_tokens,
          provider: aiResponse.provider,
        }),
      ]
    );

    return {
      response: aiResponse.content,
      conversationId: this.conversationId,
    };
  }

  getConversationId(): string {
    return this.conversationId;
  }
}

// Helper to get an agent by ID
export async function getAgentById(id: string): Promise<Agent | null> {
  const row = await dbGet("SELECT * FROM agents WHERE id = ?", [id]);
  return (row as Agent) || null;
}

// Helper to get all active agents
export async function getActiveAgents(): Promise<Agent[]> {
  return await dbAll("SELECT * FROM agents WHERE is_active = 1 ORDER BY created_at DESC") as Agent[];
}
