import { NextRequest, NextResponse } from "next/server";
import { getAgentById, OpenClawAgent } from "@/lib/agent";
import { v4 as uuidv4 } from "uuid";

const MAX_MESSAGE_LENGTH = 2000;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 messages per hour per visitor

// In-memory rate limit store (resets on redeploy, which is acceptable for serverless)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(visitorId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(visitorId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(visitorId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, message, conversationId, visitorId } = body;

    if (!agentId || !message) {
      return NextResponse.json(
        { error: "agentId and message are required" },
        { status: 400 }
      );
    }

    if (typeof message !== "string" || message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message must be a string of ${MAX_MESSAGE_LENGTH} characters or fewer` },
        { status: 400 }
      );
    }

    if (typeof agentId !== "string" || agentId.length > 100) {
      return NextResponse.json({ error: "Invalid agentId" }, { status: 400 });
    }

    // Rate limiting by visitor IP + visitorId
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimitKey = `${clientIp}_${visitorId || "anon"}`;

    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { error: "Too many messages. Please try again later." },
        { status: 429 }
      );
    }

    const agent = await getAgentById(agentId);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (!agent.is_active) {
      return NextResponse.json({ error: "Agent is not active" }, { status: 403 });
    }

    const clawAgent = new OpenClawAgent(agent, conversationId || undefined);
    const visitor = visitorId || `visitor_${uuidv4().slice(0, 8)}`;

    const result = await clawAgent.chat(message.trim(), visitor);

    return NextResponse.json({
      response: result.response,
      conversationId: result.conversationId,
      agentName: agent.name,
    });
  } catch (error: unknown) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
