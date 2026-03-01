import { getDb } from "./db";

interface DocumentChunk {
  id: string;
  title: string;
  content: string;
  doc_type: string;
}

/**
 * Simple keyword-based retrieval for document context.
 * Searches documents assigned to an agent and returns relevant chunks.
 */
export function retrieveContext(agentId: string, query: string, maxChunks: number = 5): DocumentChunk[] {
  const db = getDb();

  // Get all documents assigned to this agent
  const docs = db
    .prepare(
      `SELECT d.id, d.title, d.content, d.doc_type
       FROM documents d
       JOIN agent_documents ad ON d.id = ad.document_id
       WHERE ad.agent_id = ?`
    )
    .all(agentId) as DocumentChunk[];

  if (docs.length === 0) {
    // If no documents are specifically assigned, use all documents
    const allDocs = db
      .prepare("SELECT id, title, content, doc_type FROM documents")
      .all() as DocumentChunk[];
    return rankDocuments(allDocs, query, maxChunks);
  }

  return rankDocuments(docs, query, maxChunks);
}

/**
 * Simple TF-IDF-like ranking based on keyword overlap.
 */
function rankDocuments(docs: DocumentChunk[], query: string, maxChunks: number): DocumentChunk[] {
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const scored = docs.map((doc) => {
    const content = doc.content.toLowerCase();
    const title = doc.title.toLowerCase();

    let score = 0;
    for (const term of queryTerms) {
      // Count occurrences in content
      const contentMatches = (content.match(new RegExp(escapeRegex(term), "g")) || []).length;
      score += contentMatches;

      // Title matches are worth more
      if (title.includes(term)) {
        score += 5;
      }
    }

    // Boost resume-type documents
    if (doc.doc_type === "resume") score *= 1.5;

    return { doc, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks)
    .map((s) => s.doc);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Format retrieved documents into a context string for the AI prompt.
 */
export function formatContext(chunks: DocumentChunk[]): string {
  if (chunks.length === 0) return "";

  let context = "\n\n--- RELEVANT DOCUMENTS ABOUT THE SITE OWNER ---\n\n";
  for (const chunk of chunks) {
    context += `### ${chunk.title} (${chunk.doc_type})\n${chunk.content}\n\n---\n\n`;
  }
  return context;
}
