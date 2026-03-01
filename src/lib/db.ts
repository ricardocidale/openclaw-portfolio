import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "openclaw.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initializeDb(db);
  }
  return db;
}

function initializeDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
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
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      filename TEXT NOT NULL,
      content TEXT NOT NULL,
      doc_type TEXT DEFAULT 'general',
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agent_documents (
      agent_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      PRIMARY KEY (agent_id, document_id),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      visitor_id TEXT,
      title TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS analytics (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      agent_id TEXT,
      conversation_id TEXT,
      visitor_id TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics(event_type);
    CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics(created_at);
  `);

  // Seed a default agent if none exist
  const count = db.prepare("SELECT COUNT(*) as count FROM agents").get() as { count: number };
  if (count.count === 0) {
    const { v4: uuidv4 } = require("uuid");
    db.prepare(`
      INSERT INTO agents (id, name, description, system_prompt, personality, ai_provider)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      "Portfolio Assistant",
      "A helpful AI agent that knows everything about the site owner. Ask me anything!",
      `You are a friendly and professional AI assistant representing the site owner.
You have access to documents about the site owner including their resume, projects, and background.
Answer questions about the site owner based on the documents provided.
If you don't have information about something, say so honestly.
Be conversational, helpful, and engaging.`,
      "Professional yet friendly, knowledgeable, and engaging",
      "anthropic"
    );
  }
}
