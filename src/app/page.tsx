"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Agent {
  id: string;
  name: string;
  description: string;
  avatar: string | null;
}

export default function HomePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => {
        setAgents(data.agents || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const ownerName = process.env.NEXT_PUBLIC_SITE_OWNER || "Welcome";

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="border-b border-dark-400 bg-dark-800/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center font-bold text-sm">
              OC
            </div>
            <span className="font-semibold text-lg">OpenClaw</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#agents" className="text-dark-100 hover:text-white transition-colors">
              Agents
            </a>
            <Link
              href="/admin"
              className="text-dark-200 hover:text-dark-100 text-sm transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-block mb-6 px-4 py-1.5 bg-primary-600/10 border border-primary-600/20 rounded-full">
          <span className="text-primary-400 text-sm font-medium">AI-Powered Portfolio</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-primary-200 to-primary-400 bg-clip-text text-transparent">
          {ownerName}
        </h1>
        <p className="text-xl text-dark-100 max-w-2xl mx-auto mb-10">
          Talk to my AI agents to learn about my experience, skills, and projects.
          They know everything about me — just ask!
        </p>
        <a
          href="#agents"
          className="btn-primary text-lg px-8 py-3 inline-block"
        >
          Start a Conversation
        </a>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: "Choose an Agent",
              desc: "Select from specialized AI agents, each trained on different aspects of my background.",
              icon: "01",
            },
            {
              title: "Ask Anything",
              desc: "Have a natural conversation about my experience, skills, projects, or anything else.",
              icon: "02",
            },
            {
              title: "Get Answers",
              desc: "Receive intelligent, contextual answers sourced from my resume and documents.",
              icon: "03",
            },
          ].map((item) => (
            <div key={item.title} className="card text-center">
              <div className="w-12 h-12 bg-primary-600/20 rounded-xl flex items-center justify-center mx-auto mb-4 text-primary-400 font-bold">
                {item.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
              <p className="text-dark-100 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Agents */}
      <section id="agents" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-4">AI Agents</h2>
        <p className="text-dark-100 text-center mb-12">
          Choose an agent to start chatting
        </p>

        {loading ? (
          <div className="text-center text-dark-200">Loading agents...</div>
        ) : agents.length === 0 ? (
          <div className="text-center text-dark-200">
            No agents available yet. Check back soon!
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <Link
                key={agent.id}
                href={`/chat/${agent.id}`}
                className="card hover:border-primary-600/50 transition-all duration-200 group cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary-600/20 rounded-xl flex items-center justify-center text-primary-400 font-bold text-lg shrink-0">
                    {agent.avatar || agent.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg group-hover:text-primary-400 transition-colors">
                      {agent.name}
                    </h3>
                    <p className="text-dark-100 text-sm mt-1">{agent.description}</p>
                  </div>
                </div>
                <div className="mt-4 text-right">
                  <span className="text-primary-400 text-sm font-medium group-hover:underline">
                    Start Chat →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-400 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between text-sm text-dark-200">
          <span>Powered by OpenClaw Agent Framework</span>
          <span>Built with Claude + Next.js</span>
        </div>
      </footer>
    </div>
  );
}
