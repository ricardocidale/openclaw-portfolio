import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbGet } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET - List conversations or get conversation messages
export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("id");

  if (conversationId) {
    // Get specific conversation with messages
    const conversation = await dbGet(
      `SELECT c.*, a.name as agent_name
       FROM conversations c
       JOIN agents a ON c.agent_id = a.id
       WHERE c.id = ?`,
      [conversationId]
    );

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const messages = await dbAll(
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
      [conversationId]
    );

    return NextResponse.json({ conversation, messages });
  }

  // List all conversations
  const conversations = await dbAll(
    `SELECT c.id, c.title, c.visitor_id, c.created_at, c.updated_at,
            a.name as agent_name,
            (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
     FROM conversations c
     JOIN agents a ON c.agent_id = a.id
     ORDER BY c.updated_at DESC
     LIMIT 50`
  );

  return NextResponse.json({ conversations });
}
