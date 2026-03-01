import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

// GET - List documents (admin only)
export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const documents = db
    .prepare(
      `SELECT id, title, filename, doc_type,
              LENGTH(content) as content_length,
              created_at
       FROM documents ORDER BY created_at DESC`
    )
    .all();

  return NextResponse.json({ documents });
}

// POST - Upload document (admin only)
export async function POST(req: NextRequest) {
  try {
    requireAuth(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    let title: string;
    let content: string;
    let filename: string;
    let docType: string;
    let agentIds: string[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      title = (formData.get("title") as string) || "";
      docType = (formData.get("doc_type") as string) || "general";
      const agentIdsStr = formData.get("agent_ids") as string;
      if (agentIdsStr) agentIds = JSON.parse(agentIdsStr);

      if (!file) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
      }

      filename = file.name;
      if (!title) title = filename;
      content = await file.text();
    } else {
      const body = await req.json();
      title = body.title;
      content = body.content;
      filename = body.filename || "manual-entry.txt";
      docType = body.doc_type || "general";
      agentIds = body.agent_ids || [];
    }

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const db = getDb();
    const id = uuidv4();

    db.prepare(
      "INSERT INTO documents (id, title, filename, content, doc_type) VALUES (?, ?, ?, ?, ?)"
    ).run(id, title, filename, content, docType);

    // Link to agents
    if (agentIds.length > 0) {
      const insertLink = db.prepare(
        "INSERT OR IGNORE INTO agent_documents (agent_id, document_id) VALUES (?, ?)"
      );
      for (const agentId of agentIds) {
        insertLink.run(agentId, id);
      }
    } else {
      // Link to all active agents by default
      const agents = db.prepare("SELECT id FROM agents WHERE is_active = 1").all() as { id: string }[];
      const insertLink = db.prepare(
        "INSERT OR IGNORE INTO agent_documents (agent_id, document_id) VALUES (?, ?)"
      );
      for (const agent of agents) {
        insertLink.run(agent.id, id);
      }
    }

    return NextResponse.json(
      { document: { id, title, filename, doc_type: docType, content_length: content.length } },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete document (admin only)
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
      return NextResponse.json({ error: "Document ID required" }, { status: 400 });
    }

    const db = getDb();
    db.prepare("DELETE FROM documents WHERE id = ?").run(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
