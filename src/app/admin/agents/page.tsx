"use client";

import { useState, useEffect } from "react";

interface Agent {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  personality: string;
  ai_provider: string;
  ai_model: string;
  is_active: number;
  created_at: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    system_prompt: "",
    personality: "",
    ai_provider: "anthropic",
    ai_model: "",
    is_active: true,
  });

  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

  useEffect(() => {
    fetchAgents();
  }, []);

  async function fetchAgents() {
    const res = await fetch("/api/agents", {
      headers: { Authorization: `Bearer ${token}`, "x-admin": "true" },
    });
    const data = await res.json();
    setAgents(data.agents || []);
  }

  function openCreate() {
    setEditAgent(null);
    setForm({
      name: "",
      description: "",
      system_prompt: "You are a helpful AI assistant representing the site owner. Answer questions based on the provided documents.",
      personality: "Professional yet friendly",
      ai_provider: "anthropic",
      ai_model: "",
      is_active: true,
    });
    setShowForm(true);
  }

  function openEdit(agent: Agent) {
    setEditAgent(agent);
    setForm({
      name: agent.name,
      description: agent.description || "",
      system_prompt: agent.system_prompt,
      personality: agent.personality || "",
      ai_provider: agent.ai_provider || "anthropic",
      ai_model: agent.ai_model || "",
      is_active: !!agent.is_active,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const method = editAgent ? "PUT" : "POST";
    const body = editAgent ? { ...form, id: editAgent.id } : form;

    await fetch("/api/agents", {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    setShowForm(false);
    fetchAgents();
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this agent?")) return;

    await fetch(`/api/agents?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    fetchAgents();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Agents</h1>
        <button onClick={openCreate} className="btn-primary">
          + New Agent
        </button>
      </div>

      {/* Agent list */}
      <div className="grid gap-4">
        {agents.map((agent) => (
          <div key={agent.id} className="card flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-lg">{agent.name}</h3>
                <span
                  className={`px-2 py-0.5 rounded text-xs ${
                    agent.is_active
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {agent.is_active ? "Active" : "Inactive"}
                </span>
                <span className="px-2 py-0.5 bg-dark-500 rounded text-xs text-dark-200">
                  {agent.ai_provider}
                </span>
              </div>
              <p className="text-dark-200 text-sm mt-1">{agent.description}</p>
              <p className="text-dark-300 text-xs mt-2">
                Created: {new Date(agent.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2 ml-4">
              <button onClick={() => openEdit(agent)} className="btn-secondary text-sm">
                Edit
              </button>
              <button
                onClick={() => handleDelete(agent.id)}
                className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6">
              {editAgent ? "Edit Agent" : "Create Agent"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-dark-100 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-dark-100 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-100 mb-1">System Prompt</label>
                <textarea
                  value={form.system_prompt}
                  onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                  className="input-field h-32"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-dark-100 mb-1">Personality</label>
                <input
                  type="text"
                  value={form.personality}
                  onChange={(e) => setForm({ ...form, personality: e.target.value })}
                  className="input-field"
                  placeholder="e.g., Professional yet friendly"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-dark-100 mb-1">AI Provider</label>
                  <select
                    value={form.ai_provider}
                    onChange={(e) => setForm({ ...form, ai_provider: e.target.value })}
                    className="input-field"
                  >
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="openai">OpenAI (GPT)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-dark-100 mb-1">Model (optional)</label>
                  <input
                    type="text"
                    value={form.ai_model}
                    onChange={(e) => setForm({ ...form, ai_model: e.target.value })}
                    className="input-field"
                    placeholder="e.g., claude-sonnet-4-20250514"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="is_active" className="text-sm text-dark-100">
                  Active (visible to visitors)
                </label>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editAgent ? "Save Changes" : "Create Agent"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
