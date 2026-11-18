"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, CheckCircle2 } from "lucide-react";
import { FeedbackForm } from "@/components/FeedbackForm";
import { ZIMBABWE_PROVINCES } from "@/data/zimbabwe-provinces";
import { DEFAULT_FEEDBACK_TOPIC, type FeedbackCategory } from "@/lib/feedback";

interface OpenDetail {
  topic?: string;
  category?: FeedbackCategory;
}

const OPEN_EVENT = "open-feedback-modal";

export function openFeedbackModal(detail?: OpenDetail) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail }));
  }
}

export function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("wrong-info");
  const [topic, setTopic] = useState(DEFAULT_FEEDBACK_TOPIC);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<OpenDetail | undefined>).detail;
      if (detail?.topic) setTopic(detail.topic);
      if (detail?.category) setCategory(detail.category);
      setSubmittedId(null);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/explore/")) {
      const slug = pathname.split("/")[2];
      const match = ZIMBABWE_PROVINCES.find((p) => p.slug === slug);
      if (match) setTopic(`${match.capital} (${match.province})`);
    } else if (pathname === "/harare") {
      setTopic("Harare Province");
    }
  }, [pathname]);

  if (!open) return null;

  const close = () => setOpen(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#060e16]/65 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={close}
    >
      <div
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t border border-[#2b302b] border-b-0 bg-[#0c0e0c] p-5 text-[#e9e5db] shadow-2xl sm:rounded sm:border-b sm:p-6"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#2b302b] sm:hidden" aria-hidden="true" />
        <div className="flex items-start justify-between gap-4 border-b border-[#2b302b] pb-4">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-[#e9e5db] sm:text-2xl">
              Report a problem
            </h2>
            <p className="mt-1.5 text-sm text-[#a4aaa2]">
              A fact that is wrong, a rule that has changed, a link that is dead, something odd on the map. Say what it is and, if you can, where you read otherwise.
            </p>
          </div>
          <button
            onClick={close}
            aria-label="Close"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded text-[#a4aaa2] hover:bg-[#e9e5db]/10 hover:text-[#e9e5db] sm:h-8 sm:w-8"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {submittedId ? (
          <div className="py-6">
            <div className="flex items-center gap-2 text-[#ffd200]">
              <CheckCircle2 className="h-5 w-5" />
              <h3 className="text-lg font-extrabold text-[#e9e5db]">Thank you</h3>
            </div>
            <p className="mt-2 text-sm text-[#a4aaa2]">
              Your report has been logged (ref:{" "}
              <span className="font-mono-tech text-[#ffd200]">{submittedId}</span>).
            </p>
            <div className="mt-5 flex items-center gap-3">
              <Link href="/feedback" onClick={close} className="nld-btn-quiet text-sm">
                View reports log
              </Link>
              <button onClick={close} className="nld-btn text-sm">
                Close
              </button>
            </div>
          </div>
        ) : (
          <FeedbackForm
            pageUrl={pathname}
            initialCategory={category}
            initialTopic={topic}
            onSubmitted={setSubmittedId}
            onCancel={close}
          />
        )}
      </div>
    </div>
  );
}
