"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FeedbackForm } from "@/components/FeedbackForm";
import { Flag, CheckCircle2, MessageSquare } from "lucide-react";
import { feedbackCategoryLabel } from "@/lib/feedback";

interface PublicSubmission {
  id: string;
  pageUrl: string;
  category: string;
  provinceOrTopic: string;
  message: string;
  createdAt: string;
  status: string;
}

export default function FeedbackPage() {
  const [submissions, setSubmissions] = useState<PublicSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const loadList = async () => {
    try {
      const res = await fetch("/api/feedback");
      const data = await res.json();
      setSubmissions(data.submissions || []);
    } catch {
      // The log stays as it was; the form still works.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <header className="border-b border-[#2b302b] pb-8">
          <p className="font-mono-tech text-xs uppercase tracking-widest text-[#ffd200]">
            COMMUNITY FEEDBACK &amp; CORRECTIONS
          </p>
          <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-[#e9e5db] sm:text-5xl">
            Help keep All About Zimbabwe accurate.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[#a4aaa2]">
            Zimbabwe evolves fast—USD rents, kombi fares, passport fees, ZESA schedules, and landmarks change. Submit a response whenever you spot anything wrong or missing in any province.
          </p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-12">
          <section className="rounded border border-[#2b302b] bg-[#151815] p-6 lg:col-span-6">
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-[#ffd200]" />
              <h2 className="font-display text-xl font-semibold text-[#e9e5db]">
                Submit a Correction or Report
              </h2>
            </div>

            <FeedbackForm
              onSubmitted={() => setJustSubmitted(true)}
            />

            {justSubmitted && (
              <div className="mt-4 flex items-center gap-2 rounded border border-[#4cb82a]/40 bg-[#4cb82a]/10 px-3 py-2 text-xs text-[#4cb82a]">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Response submitted! Thank you. It will appear in the log once it has been reviewed.</span>
              </div>
            )}
          </section>

          <section className="lg:col-span-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#4cb82a]" />
              <h2 className="font-display text-xl font-semibold text-[#e9e5db]">
                Reviewed Community Submissions ({submissions.length})
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              {loading ? (
                <div className="rounded border border-[#2b302b] bg-[#151815] p-6 text-xs text-[#a4aaa2]">
                  Loading recent submissions…
                </div>
              ) : submissions.length === 0 ? (
                <div className="rounded border border-[#2b302b] bg-[#151815] p-6 text-xs text-[#a4aaa2]">
                  No reviewed reports yet. Reports appear here once they have been reviewed. Spotted an outdated fare, rent range, or map landmark? Use the form to send one.
                </div>
              ) : (
                submissions.map((s) => (
                  <div
                    key={s.id}
                    className="rounded border border-[#2b302b] bg-[#151815] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 font-mono-tech text-[10px]">
                      <span className="rounded bg-[#ffd200]/20 px-2 py-0.5 text-[#ffd200]">
                        {feedbackCategoryLabel(s.category)}
                      </span>
                      <span className="text-[#4cb82a] uppercase">{s.status}</span>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-[#e9e5db]">
                      {s.provinceOrTopic}{" "}
                      <span className="font-mono-tech font-normal text-[#a4aaa2]">
                        · {s.pageUrl}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#dadcd7]">
                      {s.message}
                    </p>
                    <div className="mt-2 font-mono-tech text-[10px] text-[#a4aaa2]">
                      {new Date(s.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
