"use client";

import React, { useState } from "react";
import { ICH } from "../ui-primitives";

const EMOJIS = ["🕌", "📖", "📚", "🤲", "🌙", "⭐", "🎓", "👨‍👩‍👧", "🧒", "🍽️", "❤️", "🤝", "🎉", "📿", "🏗️", "💰", "🗓️", "🎙️", "🌐", "🔗", "📌", "🕋", "☪️", "🌱"];

/** Click-to-pick icon, with a free-text fallback for anything else. */
export default function EmojiPicker({ value, onChange, id }: { value: string; onChange: (v: string) => void; id?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Icon: ${value || "none"}. Click to change`}
        aria-expanded={open}
        style={{ width: 56, height: 44, fontSize: 22, border: `1px solid ${ICH.border}`, borderRadius: 6, background: "#fff", cursor: "pointer" }}
      >
        {value || "＋"}
      </button>
      {open && (
        <div style={{ position: "absolute", zIndex: 20, top: 50, left: 0, width: 264, background: "#fff", border: `1px solid ${ICH.border}`, borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,.14)", padding: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => { onChange(e); setOpen(false); }} style={{ fontSize: 22, height: 38, border: e === value ? `2px solid ${ICH.primary}` : "1px solid transparent", borderRadius: 6, background: "#fff", cursor: "pointer" }}>
                {e}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: ICH.textMuted }}>Or type/paste:</span>
            <input value={value} onChange={(ev) => onChange(ev.target.value.slice(0, 8))} style={{ width: 70, padding: "4px 6px", border: `1px solid ${ICH.border}`, borderRadius: 4, fontSize: 16 }} />
            <button type="button" onClick={() => setOpen(false)} style={{ marginLeft: "auto", fontSize: 12.5, border: "none", background: "none", color: ICH.primary, cursor: "pointer", fontWeight: 600 }}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
