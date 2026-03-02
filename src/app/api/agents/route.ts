import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbGet, dbRun } from "@/lib/db";
import { requireAuth, getTokenFromRequest } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

const ALLOWED_PROVIDERS = ["anthropic", "openai"];
const MAX_NAME_LENGTH = 200;
const MAX_PROMPT_LENGTH = 10000;

// GET - List agents (public for active, all for authenticated admin)
export async function GET(req: NextRequest) {
  // Check if request has a valid token — if so, return full data
  const token = getTokenFromRequest(req);
  if (token) {
    try {
      requireAuth(req);
      const agents = await dbAll("SELECT * FROM agents ORDER BY created_at DESC");
      return NextResponse.json({ agents });
    } catch {
      // Token invalid — fall through to public response
    }
  }

  const agents = await dbAll(
    "SELECT id, name, description, avatar FROM agents WHERE is_active = 1 ORDER BY created_at DESC"
  );
  return NextResponse.json({ agents });
}

// POST - Create agent (admin only)
export async function POST(req: NextRequest) {
  try {
    requireAuth(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (!body.name || typeof body.name !== "string" || body.name.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: "Valid name is required" }, { status: 400 });
    }
    if (!body.system_prompt || typeof body.system_prompt !== "string" || body.system_prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json({ error: "Valid system_prompt is required" }, { status: 400 });
    }

    const provider = body.ai_provider || "anthropic";
    if (!ALLOWED_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: `ai_provider must be one of: ${ALLOWED_PROVIDERS.join(", ")}` }, { status: 400 });
    }

    const id = uuidv4();

    await dbRun(
      `INSERT INTO agents (id, name, description, avatar, system_prompt, personality, ai_provider, ai_model, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.name.trim(),
        (body.description || "").slice(0, 1000),
        body.avatar || null,
        body.system_prompt,
        body.personality ? String(body.personality).slice(0, 500) : null,
        provider,
        body.ai_model ? String(body.ai_model).slice(0, 100) : null,
        body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1,
      ]
    );

    const agent = await dbGet("SELECT * FROM agents WHERE id = ?", [id]);
    return NextResponse.json({ agent }, { status: 201 });
  } catch (error: unknown) {
    console.error("Agent create error:", error);
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
  }
}

// PUT - Update agent (admin only)
export async function PUT(req: NextRequest) {
  try {
    requireAuth(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (!body.id || typeof body.id !== "string") {
      return NextResponse.json({ error: "Agent ID required" }, { status: 400 });
    }

    if (body.name && (typeof body.name !== "string" || body.name.length > MAX_NAME_LENGTH)) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
    if (body.system_prompt && (typeof body.system_prompt !== "string" || body.system_prompt.length > MAX_PROMPT_LENGTH)) {
      return NextResponse.json({ error: "Invalid system_prompt" }, { status: 400 });
    }
    if (body.ai_provider && !ALLOWED_PROVIDERS.includes(body.ai_provider)) {
      return NextResponse.json({ error: `ai_provider must be one of: ${ALLOWED_PROVIDERS.join(", ")}` }, { status: 400 });
    }

    await dbRun(
      `UPDATE agents SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        avatar = COALESCE(?, avatar),
        system_prompt = COALESCE(?, system_prompt),
        personality = COALESCE(?, personality),
        ai_provider = COALESCE(?, ai_provider),
        ai_model = COALESCE(?, ai_model),
        is_active = COALESCE(?, is_active),
        updated_at = datetime('now')
       WHERE id = ?`,
      [
        body.name ? body.name.trim() : null,
        body.description != null ? String(body.description).slice(0, 1000) : null,
        body.avatar || null,
        body.system_prompt || null,
        body.personality ? String(body.personality).slice(0, 500) : null,
        body.ai_provider || null,
        body.ai_model ? String(body.ai_model).slice(0, 100) : null,
        body.is_active !== undefined ? (body.is_active ? 1 : 0) : null,
        body.id,
      ]
    );

    const agent = await dbGet("SELECT * FROM agents WHERE id = ?", [body.id]);
    return NextResponse.json({ agent });
  } catch (error: unknown) {
    console.error("Agent update error:", error);
    return NextResponse.json({ error: "Failed to update agent" }, { status: 500 });
  }
}

// DELETE - Delete agent (admin only)
export async function DELETE(req: NextRequest) {
  try {
    requireAuth(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Agent ID required" }, { status: 400 });
    }

    await dbRun("DELETE FROM agents WHERE id = ?", [id]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Agent delete error:", error);
    return NextResponse.json({ error: "Failed to delete agent" }, { status: 500 });
  }
}
