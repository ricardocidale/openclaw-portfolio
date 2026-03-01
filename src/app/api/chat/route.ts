import { NextRequest, NextResponse } from "next/server";
import { getAgentById, OpenClawAgent } from "@/lib/agent";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const { agentId, message, conversationId, visitorId } = await req.json();

    if (!agentId || !message) {
      return NextResponse.json(
        { error: "agentId and message are required" },
        { status: 400 }
      );
    }

    const agent = getAgentById(agentId);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (!agent.is_active) {
      return NextResponse.json({ error: "Agent is not active" }, { status: 403 });
    }

    const clawAgent = new OpenClawAgent(agent, conversationId || undefined);
    const visitor = visitorId || `visitor_${uuidv4().slice(0, 8)}`;

    const result = await clawAgent.chat(message, visitor);

    return NextResponse.json({
      response: result.response,
      conversationId: result.conversationId,
      agentName: agent.name,
    });
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process message" },
      { status: 500 }
    );
  }
}
