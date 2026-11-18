"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import {
  DEFAULT_FEEDBACK_TOPIC,
  FEEDBACK_CATEGORIES,
  type FeedbackCategory,
} from "@/lib/feedback";

const FIELD = "mt-1.5 nld-input border-[#a4aaa2]/60 focus:border-[#ffd200]";
const LABEL = "block text-sm font-bold text-[#e9e5db]";

/**
 * The correction/report form. With `pageUrl` the report is tied to that page;
 * without it the reader types which page the report is about.
 */
export function FeedbackForm({
  pageUrl,
  initialCategory = "wrong-info",
  initialTopic = DEFAULT_FEEDBACK_TOPIC,
  onSubmitted,
  onCancel,
}: {
  pageUrl?: string;
  initialCategory?: FeedbackCategory;
  initialTopic?: string;
  onSubmitted: (id: string) => void;
  onCancel?: () => void;
}) {
  const [category, setCategory] = useState<string>(initialCategory);
  const [provinceOrTopic, setProvinceOrTopic] = useState(initialTopic);
  const [aboutPage, setAboutPage] = useState("/");
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageUrl: pageUrl ?? aboutPage,
          category,
          provinceOrTopic,
          message,
          contactEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not submit your feedback.");
      } else {
        setMessage("");
        onSubmitted(data.submission?.id || "saved");
      }
    } catch {
      setError("Network error while submitting feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={LABEL}>Issue type</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={FIELD}>
            {FEEDBACK_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL}>Province / topic</label>
          <input
            type="text"
            value={provinceOrTopic}
            onChange={(e) => setProvinceOrTopic(e.target.value)}
            placeholder="e.g. Harare, Bulawayo, EcoCash"
            className={FIELD}
          />
        </div>
      </div>

      {pageUrl === undefined && (
        <div>
          <label className={LABEL}>Affected page</label>
          <input
            type="text"
            value={aboutPage}
            onChange={(e) => setAboutPage(e.target.value)}
            placeholder="/harare, /explore/bulawayo, /guides/renting-an-apartment, /tools"
            className={FIELD}
          />
        </div>
      )}

      <div>
        <label className={LABEL}>What is wrong?</label>
        <textarea
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe what's inaccurate, outdated, or broken…"
          className={FIELD}
        />
      </div>

      <div>
        <label className={LABEL}>
          Your email address{" "}
          <span className="font-normal text-xs text-[#a4aaa2]">
            optional, only if you want an answer
          </span>
        </label>
        <input
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="you@example.com"
          className={FIELD}
        />
      </div>

      {pageUrl !== undefined && (
        <p className="text-xs text-[#a4aaa2]">
          Sent with it: the page you are on,{" "}
          <strong className="text-[#e9e5db]">{pageUrl}</strong>.
        </p>
      )}

      {error && <p className="nld-callout px-3 py-2 text-xs text-[#e9e5db]">{error}</p>}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button type="submit" disabled={submitting} className="nld-btn text-sm">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send report
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="nld-btn-quiet text-sm">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
