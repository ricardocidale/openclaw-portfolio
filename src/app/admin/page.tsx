"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth")
      .then((res) => {
        if (res.ok) {
          setAuthenticated(true);
          fetchStats();
        }
      })
      .catch(() => {});
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch("/api/analytics?period=7d");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {}
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setAuthenticated(true);
        fetchStats();
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  }

  // Login form
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card max-w-md w-full">
          <h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-dark-100 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-dark-100 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                required
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          {
            label: "Conversations",
            value: stats?.overview?.totalConversations ?? "-",
            sub: "Last 7 days",
          },
          {
            label: "Messages",
            value: stats?.overview?.totalMessages ?? "-",
            sub: "Last 7 days",
          },
          {
            label: "Unique Visitors",
            value: stats?.overview?.uniqueVisitors ?? "-",
            sub: "Last 7 days",
          },
          {
            label: "Tokens Used",
            value: stats
              ? ((stats.overview?.totalInputTokens || 0) + (stats.overview?.totalOutputTokens || 0)).toLocaleString()
              : "-",
            sub: "Input + Output",
          },
        ].map((stat) => (
          <div key={stat.label} className="card">
            <p className="text-dark-200 text-sm">{stat.label}</p>
            <p className="text-3xl font-bold mt-1">{stat.value}</p>
            <p className="text-dark-300 text-xs mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Agent performance */}
      {stats?.agentStats && stats.agentStats.length > 0 && (
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">Agent Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-dark-200 border-b border-dark-400">
                  <th className="pb-3">Agent</th>
                  <th className="pb-3">Conversations</th>
                  <th className="pb-3">Messages</th>
                </tr>
              </thead>
              <tbody>
                {stats.agentStats.map((agent: any) => (
                  <tr key={agent.agent_id} className="border-b border-dark-500">
                    <td className="py-3 font-medium">{agent.agent_name}</td>
                    <td className="py-3">{agent.conversations}</td>
                    <td className="py-3">{agent.messages}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent conversations */}
      {stats?.recentConversations && stats.recentConversations.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Recent Conversations</h2>
          <div className="space-y-3">
            {stats.recentConversations.map((conv: any) => (
              <div
                key={conv.id}
                className="flex items-center justify-between py-3 border-b border-dark-500 last:border-0"
              >
                <div>
                  <p className="font-medium text-sm">{conv.title || "Untitled"}</p>
                  <p className="text-dark-200 text-xs">
                    {conv.agent_name} · {conv.message_count} messages
                  </p>
                </div>
                <span className="text-dark-300 text-xs">
                  {new Date(conv.updated_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
