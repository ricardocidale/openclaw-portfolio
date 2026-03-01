export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  provider: string;
  model: string;
}

export interface AIProvider {
  name: string;
  chat(messages: ChatMessage[], options?: { model?: string; maxTokens?: number }): Promise<AIResponse>;
}

// Anthropic Claude Provider
class AnthropicProvider implements AIProvider {
  name = "anthropic";

  async chat(messages: ChatMessage[], options?: { model?: string; maxTokens?: number }): Promise<AIResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    const model = options?.model || "claude-sonnet-4-20250514";
    const maxTokens = options?.maxTokens || 1024;

    // Extract system message
    const systemMsg = messages.find((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      messages: chatMessages.map((m) => ({ role: m.role, content: m.content })),
    };
    if (systemMsg) {
      body.system = systemMsg.content;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      content: data.content[0]?.text || "",
      usage: {
        input_tokens: data.usage?.input_tokens || 0,
        output_tokens: data.usage?.output_tokens || 0,
      },
      provider: "anthropic",
      model,
    };
  }
}

// OpenAI Provider
class OpenAIProvider implements AIProvider {
  name = "openai";

  async chat(messages: ChatMessage[], options?: { model?: string; maxTokens?: number }): Promise<AIResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");

    const model = options?.model || "gpt-4o";
    const maxTokens = options?.maxTokens || 1024;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      content: data.choices[0]?.message?.content || "",
      usage: {
        input_tokens: data.usage?.prompt_tokens || 0,
        output_tokens: data.usage?.completion_tokens || 0,
      },
      provider: "openai",
      model,
    };
  }
}

// Provider registry
const providers: Record<string, AIProvider> = {
  anthropic: new AnthropicProvider(),
  openai: new OpenAIProvider(),
};

export function getProvider(name?: string): AIProvider {
  const providerName = name || process.env.DEFAULT_AI_PROVIDER || "anthropic";
  const provider = providers[providerName];
  if (!provider) throw new Error(`Unknown AI provider: ${providerName}`);
  return provider;
}

export function listProviders(): string[] {
  return Object.keys(providers);
}
