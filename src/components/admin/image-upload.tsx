"use client";

import React, { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { ICH } from "../ui-primitives";

/** Photo picker that uploads immediately and shows a preview. */
export default function ImageUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file: File) => {
    setError("");
    if (file.size > 5 * 1024 * 1024) {
      setError(`That photo is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 5 MB.`);
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed. Please try again.");
      onChange(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      {value ? (
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Selected photo" style={{ width: 140, height: 96, objectFit: "cover", borderRadius: 6, border: `1px solid ${ICH.border}` }} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} style={btn}>{uploading ? "Uploading…" : "Replace photo"}</button>
            <button type="button" onClick={() => onChange("")} disabled={uploading} style={{ ...btn, color: "#c62828", borderColor: "#f0c9c9" }}>Remove</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{ width: "100%", padding: "22px 16px", border: `1.5px dashed ${ICH.border}`, borderRadius: 8, background: ICH.bgCard, color: ICH.primary, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, fontFamily: "Inter,sans-serif" }}
        >
          {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
          {uploading ? "Uploading…" : "Add a photo"}
          <span style={{ fontWeight: 400, fontSize: 12.5, color: ICH.textMuted }}>JPG, PNG or WebP, up to 5 MB</span>
        </button>
      )}
      {error && <div role="alert" style={{ marginTop: 8, fontSize: 13.5, color: "#b71c1c" }}>⚠ {error}</div>}
    </div>
  );
}

const btn: React.CSSProperties = { minHeight: 36, padding: "6px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600, border: `1px solid ${ICH.border}`, background: "#fff", color: ICH.primary, cursor: "pointer" };
