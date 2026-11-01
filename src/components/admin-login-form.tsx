"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ICH, Btn } from "./ui-primitives";

export default function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Login failed");
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next && next.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Couldn't reach the server. Check your connection and try again.");
      setLoading(false);
    }
  };

  const labelStyle = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: ".08em",
    textTransform: "uppercase" as const,
    color: ICH.textMuted,
    fontFamily: "Inter,sans-serif",
    marginBottom: 5,
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    border: `1px solid ${ICH.border}`,
    borderRadius: 4,
    fontSize: 14,
    fontFamily: "Inter,sans-serif",
    outline: "none",
  };

  return (
    <div style={{ background: "#fff", border: `1px solid ${ICH.border}`, borderRadius: 8, padding: "40px 36px" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <img src="/uploads/logo.png" alt="ICH" style={{ height: 48, marginBottom: 16, marginLeft: "auto", marginRight: "auto" }} />
        <h1 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 26, fontWeight: 600 }}>Admin Login</h1>
        <p style={{ fontSize: 13, color: ICH.textMuted, marginTop: 4 }}>Restricted access — ICH staff only</p>
      </div>

      <form onSubmit={handleSubmit} aria-busy={loading} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle} htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
          />
        </div>
        
        <div>
          <label style={labelStyle} htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </div>

        {error && (
          <div style={{ fontSize: 13, color: "#9a2b2b", background: "#fdf3f3", border: "1px solid #f5caca", padding: "10px 14px", borderRadius: 4 }}>
            ⚠️ {error}
          </div>
        )}

        <Btn
          type="submit"
          variant="primary"
          size="lg"
          style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
          disabled={loading}
        >
          {loading ? "Signing In..." : "Sign In"}
        </Btn>
      </form>
    </div>
  );
}
