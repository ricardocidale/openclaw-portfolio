"use client";

import { useState, useEffect } from "react";

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [period, setPeriod] = useState("7d");

  useEffect(() => {
    fetchStats();
  }, [period]);

  async function fetchStats() {
    const res = await fetch(`/api/analytics?period=${period}`);
    if (res.ok) {
      const data = await res.json();
      setStats(data);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <div className="flex gap-2">
          {["24h", "7d", "30d"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                period === p
                  ? "bg-primary-600 text-white"
                  : "bg-dark-600 text-dark-200 hover:bg-dark-500"
              }`}
            >
              {p === "24h" ? "24 Hours" : p === "7d" ? "7 Days" : "30 Days"}
            </button>
          ))}
        </div>
      </div>

      {!stats ? (
        <div className="text-dark-200">Loading analytics...</div>
      ) : (
        <>
          {/* Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[
              { label: "Conversations", value: stats.overview.totalConversations },
              { label: "Messages", value: stats.overview.totalMessages },
              { label: "Unique Visitors", value: stats.overview.uniqueVisitors },
              { label: "Input Tokens", value: stats.overview.totalInputTokens.toLocaleString() },
              { label: "Output Tokens", value: stats.overview.totalOutputTokens.toLocaleString() },
            ].map((s) => (
              <div key={s.label} className="card">
                <p className="text-dark-200 text-xs">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Messages over time */}
          {stats.messagesOverTime && stats.messagesOverTime.length > 0 && (
            <div className="card mb-8">
              <h2 className="text-lg font-semibold mb-4">Messages Over Time</h2>
              <div className="flex items-end gap-1 h-40">
                {stats.messagesOverTime.map((point: any) => {
                  const max = Math.max(...stats.messagesOverTime.map((p: any) => p.count));
                  const height = max > 0 ? (point.count / max) * 100 : 0;
                  return (
                    <div key={point.date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-dark-300">{point.count}</span>
                      <div
                        className="w-full bg-primary-600/60 rounded-t"
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                      <span className="text-xs text-dark-300 truncate w-full text-center">
                        {new Date(point.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Agent stats */}
          {stats.agentStats && stats.agentStats.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Agent Breakdown</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-dark-200 border-b border-dark-400">
                    <th className="pb-3">Agent</th>
                    <th className="pb-3 text-right">Conversations</th>
                    <th className="pb-3 text-right">Messages</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.agentStats.map((a: any) => (
                    <tr key={a.agent_id} className="border-b border-dark-500">
                      <td className="py-3">{a.agent_name}</td>
                      <td className="py-3 text-right">{a.conversations}</td>
                      <td className="py-3 text-right">{a.messages}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
