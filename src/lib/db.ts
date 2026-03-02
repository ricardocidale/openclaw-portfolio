import { createClient, Client } from "@libsql/client";
import { v4 as uuidv4 } from "uuid";

let clientPromise: Promise<Client> | null = null;

function getClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = initializeDb().catch((err) => {
      // Reset so next call retries initialization
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

async function initializeDb(): Promise<Client> {
  const url = process.env.TURSO_DATABASE_URL || "file:data/openclaw.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;

  const client = createClient({ url, authToken });

  // Use batch instead of executeMultiple for better Turso remote compatibility
  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        avatar TEXT,
        system_prompt TEXT NOT NULL,
        personality TEXT,
        ai_provider TEXT DEFAULT 'anthropic',
        ai_model TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        filename TEXT NOT NULL,
        content TEXT NOT NULL,
        doc_type TEXT DEFAULT 'general',
        metadata TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS agent_documents (
        agent_id TEXT NOT NULL,
        document_id TEXT NOT NULL,
        PRIMARY KEY (agent_id, document_id),
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        visitor_id TEXT,
        title TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS analytics (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        agent_id TEXT,
        conversation_id TEXT,
        visitor_id TEXT,
        metadata TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)`,
      `CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent_id)`,
      `CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics(event_type)`,
      `CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics(created_at)`,
    ],
    "write"
  );

  // Seed a default agent if none exist
  const result = await client.execute("SELECT COUNT(*) as count FROM agents");
  const count = result.rows[0].count as number;
  if (count === 0) {
    await client.execute({
      sql: `INSERT INTO agents (id, name, description, system_prompt, personality, ai_provider)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        uuidv4(),
        "Portfolio Assistant",
        "A helpful AI agent that knows everything about the site owner. Ask me anything!",
        `You are a friendly and professional AI assistant representing the site owner.
You have access to documents about the site owner including their resume, projects, and background.
Answer questions about the site owner based on the documents provided.
If you don't have information about something, say so honestly.
Be conversational, helpful, and engaging.`,
        "Professional yet friendly, knowledgeable, and engaging",
        "anthropic",
      ],
    });
  }

  return client;
}

/** Execute a query and return all rows */
export async function dbAll(sql: string, args: any[] = []): Promise<any[]> {
  const client = await getClient();
  const result = await client.execute({ sql, args });
  return result.rows as any[];
}

/** Execute a query and return the first row */
export async function dbGet(sql: string, args: any[] = []): Promise<any | undefined> {
  const client = await getClient();
  const result = await client.execute({ sql, args });
  return result.rows[0] as any;
}

/** Execute a write query (INSERT/UPDATE/DELETE) */
export async function dbRun(sql: string, args: any[] = []): Promise<void> {
  const client = await getClient();
  await client.execute({ sql, args });
}
