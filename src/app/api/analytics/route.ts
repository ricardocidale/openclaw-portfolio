import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "7d";

  let dateFilter: string;
  switch (period) {
    case "24h":
      dateFilter = "datetime('now', '-1 day')";
      break;
    case "7d":
      dateFilter = "datetime('now', '-7 days')";
      break;
    case "30d":
      dateFilter = "datetime('now', '-30 days')";
      break;
    default:
      dateFilter = "datetime('now', '-7 days')";
  }

  // Total conversations
  const totalConversations = db
    .prepare(`SELECT COUNT(*) as count FROM conversations WHERE created_at >= ${dateFilter}`)
    .get() as { count: number };

  // Total messages
  const totalMessages = db
    .prepare(`SELECT COUNT(*) as count FROM messages WHERE created_at >= ${dateFilter}`)
    .get() as { count: number };

  // Unique visitors
  const uniqueVisitors = db
    .prepare(
      `SELECT COUNT(DISTINCT visitor_id) as count FROM conversations WHERE visitor_id IS NOT NULL AND created_at >= ${dateFilter}`
    )
    .get() as { count: number };

  // Messages per agent
  const agentStats = db
    .prepare(
      `SELECT a.name as agent_name, a.id as agent_id,
              COUNT(DISTINCT c.id) as conversations,
              COUNT(m.id) as messages
       FROM agents a
       LEFT JOIN conversations c ON a.id = c.agent_id AND c.created_at >= ${dateFilter}
       LEFT JOIN messages m ON c.id = m.conversation_id AND m.created_at >= ${dateFilter}
       GROUP BY a.id
       ORDER BY messages DESC`
    )
    .all();

  // Token usage
  const tokenUsage = db
    .prepare(
      `SELECT
        SUM(json_extract(metadata, '$.input_tokens')) as total_input_tokens,
        SUM(json_extract(metadata, '$.output_tokens')) as total_output_tokens
       FROM analytics
       WHERE event_type = 'message' AND created_at >= ${dateFilter}`
    )
    .get() as { total_input_tokens: number | null; total_output_tokens: number | null };

  // Messages over time (daily)
  const messagesOverTime = db
    .prepare(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM messages
       WHERE created_at >= ${dateFilter}
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    )
    .all();

  // Recent conversations
  const recentConversations = db
    .prepare(
      `SELECT c.id, c.title, c.visitor_id, c.created_at, c.updated_at,
              a.name as agent_name,
              (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
       FROM conversations c
       JOIN agents a ON c.agent_id = a.id
       ORDER BY c.updated_at DESC
       LIMIT 10`
    )
    .all();

  return NextResponse.json({
    overview: {
      totalConversations: totalConversations.count,
      totalMessages: totalMessages.count,
      uniqueVisitors: uniqueVisitors.count,
      totalInputTokens: tokenUsage.total_input_tokens || 0,
      totalOutputTokens: tokenUsage.total_output_tokens || 0,
    },
    agentStats,
    messagesOverTime,
    recentConversations,
    period,
  });
}
