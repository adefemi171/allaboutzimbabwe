import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { NewsletterForm } from "@/components/NewsletterForm";
import { NEWSLETTER_ISSUES } from "@/data/newsletter-issues";

export const metadata: Metadata = {
  title: "Monthly updates",
  description:
    "Monthly updates published on the site: guide updates, policy changes across Zimbabwe and new 3D map worlds, plus previous updates.",
};

export default function NewsletterPage() {
  return (
    <>
      <Navbar />
      <main
        id="main"
        className="mx-auto w-[min(100%-2*clamp(1rem,4vw,3rem),72rem)] pt-[clamp(2.5rem,6vw,5rem)] pb-16"
      >
        <header>
          <p className="mono">Monthly updates</p>
          <h1 className="mt-3.5 max-w-[16em] text-[clamp(2.1rem,4.6vw,3.4rem)] font-black leading-[1.03] tracking-[-0.025em]">
            What changed in the rules
          </h1>
          <p className="mt-5 max-w-[40rem] text-[1.15rem] leading-relaxed text-[#a4aaa2]">
            Once a month we publish an update on this page: guide updates, policy changes across
            Zimbabwe, and new 3D map worlds. Nothing is emailed yet. Leave your address to join
            the list for when updates do go out by email; it is kept for that and nothing else.
          </p>
        </header>

        <NewsletterForm id="news-email" />

        <section aria-label="Previous updates" className="mt-12 max-w-[46rem]">
          <h2 className="text-[1.65rem] font-extrabold tracking-tight">Previous updates</h2>
          <ol className="mt-4 m-0 list-none border-t border-[#2b302b] p-0">
            {NEWSLETTER_ISSUES.map((issue) => (
              <li key={issue.slug} className="border-b border-[#2b302b] py-4">
                <Link href={`/newsletter/${issue.slug}`} className="group block no-underline">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-[1.05rem] font-bold text-[#e9e5db] underline decoration-transparent underline-offset-4 group-hover:decoration-[#ffd200]">
                      {issue.title}
                    </h3>
                    <span className="mono text-[#a4aaa2]">{issue.date}</span>
                  </div>
                  <p className="mt-1.5 text-[0.95rem] leading-relaxed text-[#a4aaa2]">
                    {issue.summary}
                  </p>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <Footer />
    </>
  );
}
