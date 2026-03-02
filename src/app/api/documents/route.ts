import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbRun } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

// GET - List documents (admin only)
export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const documents = await dbAll(
    `SELECT id, title, filename, doc_type,
            LENGTH(content) as content_length,
            created_at
     FROM documents ORDER BY created_at DESC`
  );

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
      if (agentIdsStr) {
        try {
          agentIds = JSON.parse(agentIdsStr);
          if (!Array.isArray(agentIds)) agentIds = [];
        } catch {
          agentIds = [];
        }
      }

      if (!file) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
      }

      // Validate file extension
      const allowedExtensions = [".txt", ".md", ".csv", ".json"];
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        return NextResponse.json(
          { error: `File type not allowed. Accepted: ${allowedExtensions.join(", ")}` },
          { status: 400 }
        );
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "File too large. Maximum 5MB." }, { status: 400 });
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

    const id = uuidv4();

    await dbRun(
      "INSERT INTO documents (id, title, filename, content, doc_type) VALUES (?, ?, ?, ?, ?)",
      [id, title, filename, content, docType]
    );

    // Link to agents
    if (agentIds.length > 0) {
      for (const agentId of agentIds) {
        await dbRun(
          "INSERT OR IGNORE INTO agent_documents (agent_id, document_id) VALUES (?, ?)",
          [agentId, id]
        );
      }
    } else {
      // Link to all active agents by default
      const agents = await dbAll("SELECT id FROM agents WHERE is_active = 1") as { id: string }[];
      for (const agent of agents) {
        await dbRun(
          "INSERT OR IGNORE INTO agent_documents (agent_id, document_id) VALUES (?, ?)",
          [agent.id, id]
        );
      }
    }

    return NextResponse.json(
      { document: { id, title, filename, doc_type: docType, content_length: content.length } },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Document upload error:", error);
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
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

    await dbRun("DELETE FROM documents WHERE id = ?", [id]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Document delete error:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
