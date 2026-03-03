"use client";

import { useState, useEffect } from "react";

interface Document {
  id: string;
  title: string;
  filename: string;
  doc_type: string;
  content_length: number;
  created_at: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    doc_type: "general",
    file: null as File | null,
  });
  const [manualForm, setManualForm] = useState({
    title: "",
    content: "",
    doc_type: "general",
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    const res = await fetch("/api/documents");
    const data = await res.json();
    setDocuments(data.documents || []);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadForm.file) return;
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", uploadForm.file);
      formData.append("title", uploadForm.title || uploadForm.file.name);
      formData.append("doc_type", uploadForm.doc_type);

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || `Upload failed (${res.status})`);
        setUploading(false);
        return;
      }

      setShowUpload(false);
      setUploadForm({ title: "", doc_type: "general", file: null });
      fetchDocuments();
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    setError("");

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manualForm),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || `Save failed (${res.status})`);
        setUploading(false);
        return;
      }

      setShowManual(false);
      setManualForm({ title: "", content: "", doc_type: "general" });
      fetchDocuments();
    } catch (err: any) {
      setError(err.message || "Save failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this document?")) return;

    await fetch(`/api/documents?id=${id}`, { method: "DELETE" });

    fetchDocuments();
  }

  function formatSize(chars: number): string {
    if (chars < 1000) return `${chars} chars`;
    if (chars < 1000000) return `${(chars / 1000).toFixed(1)}K chars`;
    return `${(chars / 1000000).toFixed(1)}M chars`;
  }

  const docTypeColors: Record<string, string> = {
    resume: "bg-blue-500/20 text-blue-400",
    project: "bg-green-500/20 text-green-400",
    bio: "bg-purple-500/20 text-purple-400",
    general: "bg-dark-400 text-dark-100",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Documents</h1>
        <div className="flex gap-3">
          <button onClick={() => setShowManual(true)} className="btn-secondary">
            + Manual Entry
          </button>
          <button onClick={() => setShowUpload(true)} className="btn-primary">
            + Upload File
          </button>
        </div>
      </div>

      <p className="text-dark-200 text-sm mb-6">
        Upload your resume, project descriptions, bio, and other documents.
        These are used by AI agents to answer questions about you.
      </p>

      {/* Document list */}
      {documents.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-dark-200 text-lg mb-2">No documents yet</p>
          <p className="text-dark-300 text-sm">
            Upload your resume or add content manually to get started
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <div key={doc.id} className="card flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">{doc.title}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs ${docTypeColors[doc.doc_type] || docTypeColors.general}`}>
                    {doc.doc_type}
                  </span>
                </div>
                <p className="text-dark-300 text-xs mt-1">
                  {doc.filename} · {formatSize(doc.content_length)} · {new Date(doc.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleDelete(doc.id)}
                className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card max-w-lg w-full">
            <h2 className="text-xl font-bold mb-6">Upload Document</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              {error && <p className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded">{error}</p>}
              <div>
                <label className="block text-sm text-dark-100 mb-1">File</label>
                <input
                  type="file"
                  accept=".txt,.md,.json,.csv"
                  onChange={(e) =>
                    setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })
                  }
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-dark-100 mb-1">Title (optional)</label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  className="input-field"
                  placeholder="Auto-detected from filename"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-100 mb-1">Document Type</label>
                <select
                  value={uploadForm.doc_type}
                  onChange={(e) => setUploadForm({ ...uploadForm, doc_type: e.target.value })}
                  className="input-field"
                >
                  <option value="resume">Resume / CV</option>
                  <option value="project">Project Description</option>
                  <option value="bio">Bio / About Me</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setShowUpload(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={uploading}>
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {showManual && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6">Add Document Manually</h2>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              {error && <p className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded">{error}</p>}
              <div>
                <label className="block text-sm text-dark-100 mb-1">Title</label>
                <input
                  type="text"
                  value={manualForm.title}
                  onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-dark-100 mb-1">Document Type</label>
                <select
                  value={manualForm.doc_type}
                  onChange={(e) => setManualForm({ ...manualForm, doc_type: e.target.value })}
                  className="input-field"
                >
                  <option value="resume">Resume / CV</option>
                  <option value="project">Project Description</option>
                  <option value="bio">Bio / About Me</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-dark-100 mb-1">Content</label>
                <textarea
                  value={manualForm.content}
                  onChange={(e) => setManualForm({ ...manualForm, content: e.target.value })}
                  className="input-field h-64"
                  placeholder="Paste your resume, bio, or project description here..."
                  required
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setShowManual(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={uploading}>
                  {uploading ? "Saving..." : "Save Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
