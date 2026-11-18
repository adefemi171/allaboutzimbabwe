"use client";

import type { ReactNode } from "react";
import { openFeedbackModal } from "@/components/FeedbackWidget";
import type { FeedbackCategory } from "@/lib/feedback";

export function ReportButton({
  topic,
  category,
  className = "nld-btn",
  children = "Report a problem",
}: {
  topic: string;
  category?: FeedbackCategory;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => openFeedbackModal({ topic, category })}
      className={className}
    >
      {children}
    </button>
  );
}
