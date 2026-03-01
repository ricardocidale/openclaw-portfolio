"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      setAuthenticated(true);
    }
    setChecking(false);
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-dark-200">Loading...</div>
      </div>
    );
  }

  if (!authenticated && pathname !== "/admin") {
    router.push("/admin");
    return null;
  }

  if (!authenticated) {
    return <>{children}</>;
  }

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: "D" },
    { href: "/admin/agents", label: "Agents", icon: "A" },
    { href: "/admin/documents", label: "Documents", icon: "F" },
    { href: "/admin/conversations", label: "Conversations", icon: "C" },
    { href: "/admin/analytics", label: "Analytics", icon: "S" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-dark-800 border-r border-dark-400 flex flex-col">
        <div className="p-6 border-b border-dark-400">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center font-bold text-sm">
              OC
            </div>
            <span className="font-semibold">Admin Panel</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                pathname === item.href
                  ? "bg-primary-600/20 text-primary-400"
                  : "text-dark-100 hover:bg-dark-600"
              }`}
            >
              <span className="w-6 h-6 bg-dark-500 rounded flex items-center justify-center text-xs font-bold">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-dark-400">
          <button
            onClick={() => {
              localStorage.removeItem("admin_token");
              document.cookie = "admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
              window.location.href = "/admin";
            }}
            className="w-full text-left px-4 py-2.5 rounded-lg text-dark-200 hover:bg-dark-600 transition-colors text-sm"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
