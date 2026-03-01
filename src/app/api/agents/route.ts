import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

// GET - List agents (public for active, all for admin)
export async function GET(req: NextRequest) {
  const db = getDb();
  const isAdmin = req.headers.get("x-admin") === "true";

  let agents;
  if (isAdmin) {
    try {
      requireAuth(req);
      agents = db.prepare("SELECT * FROM agents ORDER BY created_at DESC").all();
    } catch {
      agents = db.prepare("SELECT id, name, description, avatar FROM agents WHERE is_active = 1").all();
    }
  } else {
    agents = db
      .prepare("SELECT id, name, description, avatar FROM agents WHERE is_active = 1 ORDER BY created_at DESC")
      .all();
  }

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
    const db = getDb();
    const id = uuidv4();

    db.prepare(
      `INSERT INTO agents (id, name, description, avatar, system_prompt, personality, ai_provider, ai_model, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      body.name,
      body.description || "",
      body.avatar || null,
      body.system_prompt,
      body.personality || null,
      body.ai_provider || "anthropic",
      body.ai_model || null,
      body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1
    );

    const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(id);
    return NextResponse.json({ agent }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    const db = getDb();

    if (!body.id) {
      return NextResponse.json({ error: "Agent ID required" }, { status: 400 });
    }

    db.prepare(
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
       WHERE id = ?`
    ).run(
      body.name || null,
      body.description || null,
      body.avatar || null,
      body.system_prompt || null,
      body.personality || null,
      body.ai_provider || null,
      body.ai_model || null,
      body.is_active !== undefined ? (body.is_active ? 1 : 0) : null,
      body.id
    );

    const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(body.id);
    return NextResponse.json({ agent });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

    const db = getDb();
    db.prepare("DELETE FROM agents WHERE id = ?").run(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
