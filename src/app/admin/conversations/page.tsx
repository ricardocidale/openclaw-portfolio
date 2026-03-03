"use client";

import { useState, useEffect } from "react";

interface Conversation {
  id: string;
  title: string;
  visitor_id: string;
  agent_name: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [convDetail, setConvDetail] = useState<any>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  async function fetchConversations() {
    const res = await fetch("/api/conversations");
    const data = await res.json();
    setConversations(data.conversations || []);
  }

  async function viewConversation(id: string) {
    const res = await fetch(`/api/conversations?id=${id}`);
    const data = await res.json();
    setSelectedConv(id);
    setConvDetail(data.conversation);
    setMessages(data.messages || []);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Conversations</h1>

      <div className="flex gap-6">
        {/* Conversation list */}
        <div className="w-1/3 space-y-2">
          {conversations.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-dark-200">No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => viewConversation(conv.id)}
                className={`w-full text-left card transition-colors ${
                  selectedConv === conv.id ? "border-primary-600" : "hover:border-dark-300"
                }`}
              >
                <p className="font-medium text-sm truncate">{conv.title || "Untitled"}</p>
                <p className="text-dark-300 text-xs mt-1">
                  {conv.agent_name} · {conv.message_count} msgs
                </p>
                <p className="text-dark-300 text-xs">
                  {new Date(conv.updated_at).toLocaleString()}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Conversation detail */}
        <div className="flex-1">
          {!selectedConv ? (
            <div className="card text-center py-16">
              <p className="text-dark-200">Select a conversation to view</p>
            </div>
          ) : (
            <div className="card">
              <div className="border-b border-dark-400 pb-4 mb-4">
                <h2 className="font-semibold text-lg">{convDetail?.title || "Untitled"}</h2>
                <p className="text-dark-300 text-xs mt-1">
                  Agent: {convDetail?.agent_name} · Visitor: {convDetail?.visitor_id || "Anonymous"}
                </p>
              </div>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                        msg.role === "user"
                          ? "bg-primary-600/20 text-primary-100"
                          : "bg-dark-500 text-dark-50"
                      }`}
                    >
                      <p className="text-xs text-dark-300 mb-1">
                        {msg.role === "user" ? "Visitor" : "Agent"} ·{" "}
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
