"use client";

import { useState } from "react";

const PROMISE = "Used for the newsletter and nothing else.";

/** Newsletter sign-up. `compact` is the footer layout: visible label and an always-shown note. */
export function NewsletterForm({ id, compact = false }: { id: string; compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [note, setNote] = useState(PROMISE);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setNote(data.error || "Please enter a valid email address.");
      } else {
        setStatus("done");
        setNote(data.message || "Subscribed!");
        setEmail("");
      }
    } catch {
      setStatus("error");
      setNote("Could not subscribe right now.");
    }
  };

  const noteClass = compact
    ? `text-xs ${
        status === "error"
          ? "nld-callout px-2 py-1 text-[#e9e5db]"
          : status === "done"
          ? "font-semibold text-[#e9e5db]"
          : "text-[#a4aaa2]"
      }`
    : status === "error"
    ? "nld-callout mt-3 px-3 py-2 text-sm"
    : "mt-3 text-sm font-semibold text-[#4cb82a]";

  return (
    <form onSubmit={handleSubmit} className={compact ? "mt-3 space-y-2" : "mt-8 max-w-md"}>
      <label htmlFor={id} className={compact ? "block text-xs text-[#a4aaa2]" : "sr-only"}>
        Your email address
      </label>
      <div className={`flex flex-wrap gap-2 ${compact ? "" : "items-stretch"}`}>
        <input
          id={id}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={
            compact
              ? "nld-input min-w-[9rem] flex-1 border-[#a4aaa2]/60 px-2.5 py-1.5 focus:border-[#ffd200]"
              : "nld-input min-w-[12rem] flex-1 py-2.5"
          }
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className={`nld-btn disabled:opacity-60 ${compact ? "text-sm" : ""}`}
        >
          {status === "sending" ? "…" : "Sign up"}
        </button>
      </div>
      {(compact || status === "done" || status === "error") && <p className={noteClass}>{note}</p>}
    </form>
  );
}
