"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ReportButton } from "@/components/ReportButton";
import { CONTACT_EMAIL } from "@/lib/site";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("General inquiry");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentMsg, setSentMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSentMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not send message.");
      } else {
        setSentMsg(data.message || "Message received!");
        setMessage("");
      }
    } catch {
      setError("Network error while sending message.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main
        id="main"
        className="mx-auto w-[min(100%-2*clamp(1rem,4vw,3rem),72rem)] pt-[clamp(2.5rem,6vw,5rem)] pb-16"
      >
        <header>
          <p className="mono">Contact</p>
          <h1 className="mt-3.5 max-w-[16em] text-[clamp(2.1rem,4.6vw,3.4rem)] font-black leading-[1.03] tracking-[-0.025em]">
            Get in touch
          </h1>
          <p className="mt-5 max-w-[40rem] text-[1.15rem] leading-relaxed text-[#a4aaa2]">
            All About Zimbabwe is made by Runeward Labs. Write to{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="nld-link">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </header>

        <div className="mt-10 max-w-[46rem]">
          <section className="border-t border-[#2b302b] pt-5">
            <h2 className="text-[1.65rem] font-extrabold tracking-tight">You can write to</h2>
            <dl className="mt-4 space-y-5">
              <div>
                <dt className="font-bold">Report a mistake</dt>
                <dd className="mt-1 text-[#a4aaa2]">
                  A fact that is wrong, a rule that has changed, a dead link, something odd on the map.{" "}
                  <ReportButton
                    topic="Site Correction"
                    className="cursor-pointer text-[#e9e5db] underline underline-offset-4 hover:decoration-2"
                  />
                </dd>
              </div>
              <div>
                <dt className="font-bold">Suggest something</dt>
                <dd className="mt-1 text-[#a4aaa2]">
                  A guide that is missing, a step that was unclear, a place the map should name.
                </dd>
              </div>
              <div>
                <dt className="font-bold">Say how it went</dt>
                <dd className="mt-1 text-[#a4aaa2]">
                  If a guide got you through Civil Registry, EcoCash, or a lease—or did not—it helps to hear which one.
                </dd>
              </div>
              <div>
                <dt className="font-bold">Work together</dt>
                <dd className="mt-1 text-[#a4aaa2]">
                  Press, partnerships and business questions go to the same address.
                </dd>
              </div>
            </dl>
          </section>

          <section className="mt-10 border-t border-[#2b302b] pt-5">
            <h2 className="text-[1.65rem] font-extrabold tracking-tight">
              Questions about your own case
            </h2>
            <p className="mt-4 max-w-[40rem] leading-relaxed text-[#a4aaa2]">
              The site cannot give legal, tax or immigration advice. For that, ask the organisation
              that decides: Zimbabwe Immigration, ZIMRA, Civil Registry, or your local authority.
              Each{" "}
              <Link href="/guides" className="nld-link">
                guide
              </Link>{" "}
              names the official bodies and portals to go to, and links its sources at the end.
            </p>
          </section>

          <section className="mt-10 border-t border-[#2b302b] pt-5">
            <h2 className="text-[1.65rem] font-extrabold tracking-tight">Contact information</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="border border-[#2b302b] bg-[#151815] p-4">
                <dt className="mono">Made by</dt>
                <dd className="mt-1 font-semibold">Runeward Labs</dd>
              </div>
              <div className="border border-[#2b302b] bg-[#151815] p-4">
                <dt className="mono">Email</dt>
                <dd className="mt-1">
                  <a href={`mailto:${CONTACT_EMAIL}`} className="nld-link font-semibold">
                    {CONTACT_EMAIL}
                  </a>
                </dd>
              </div>
            </dl>
          </section>

          <section className="mt-10 border-t border-[#2b302b] pt-5">
            <h2 className="text-[1.65rem] font-extrabold tracking-tight">Send a message</h2>
            <form onSubmit={handleSubmit} className="mt-4 max-w-[40rem] space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="nld-input"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  className="nld-input"
                />
              </div>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="nld-input"
              />
              <textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message…"
                className="nld-input"
              />
              {error && (
                <p className="nld-callout px-3 py-2 text-sm text-[#e9e5db]">
                  {error}
                </p>
              )}
              {sentMsg && <p className="text-sm font-semibold text-[#4cb82a]">{sentMsg}</p>}
              <button type="submit" disabled={submitting} className="nld-btn disabled:opacity-60">
                {submitting ? "Sending…" : "Send message"}
              </button>
            </form>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
