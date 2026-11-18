import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  NEWSLETTER_ISSUES,
  getNewsletterBySlug,
} from "@/data/newsletter-issues";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function generateStaticParams() {
  return NEWSLETTER_ISSUES.map((issue) => ({ slug: issue.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const issue = getNewsletterBySlug(slug);
  if (!issue) return { title: "Monthly updates" };
  return {
    title: issue.title,
    description: issue.summary,
  };
}

export default async function NewsletterIssuePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const issue = getNewsletterBySlug(slug);
  if (!issue) notFound();

  const idx = NEWSLETTER_ISSUES.findIndex((i) => i.slug === issue.slug);
  const newerIssue = idx > 0 ? NEWSLETTER_ISSUES[idx - 1] : null;
  const olderIssue =
    idx >= 0 && idx < NEWSLETTER_ISSUES.length - 1 ? NEWSLETTER_ISSUES[idx + 1] : null;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex items-center gap-2 text-xs text-[#a4aaa2]"
        >
          <Link href="/newsletter" className="hover:text-[#e9e5db] hover:underline">
            Monthly updates
          </Link>
          <span>/</span>
          <span className="text-[#e9e5db]">{issue.title}</span>
        </nav>

        <article className="rounded border border-[#2b302b] bg-[#151815] p-6 sm:p-10">
          <header className="border-b border-[#2b302b] pb-6">
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#e9e5db] sm:text-4xl">
              {issue.title}
            </h1>
            <p className="mt-2.5 font-mono-tech text-xs text-[#a4aaa2]">
              {issue.publishedLabel}
            </p>
          </header>

          <div className="mt-6 space-y-8 text-sm leading-7 text-[#e9e5db]">
            <p className="text-base leading-relaxed text-[#e9e5db]">{issue.intro}</p>

            {issue.sections.map((sec) => (
              <section key={sec.heading} className="space-y-3">
                <h2 className="font-display border-b border-[#2b302b] pb-1.5 text-2xl font-semibold text-[#e9e5db]">
                  {sec.heading}
                </h2>
                {sec.subheading && (
                  <h3 className="font-display pt-1 text-base font-semibold text-[#62b4e8]">
                    {sec.subheading}
                  </h3>
                )}
                {sec.paragraphs.map((p, i) => (
                  <p key={i} className="text-[#dadcd7]">
                    {p}
                  </p>
                ))}
                {sec.bullets && (
                  <ul className="list-disc space-y-1.5 pl-5 text-[#dadcd7]">
                    {sec.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            {issue.sources.length > 0 && (
              <section className="border-t border-[#2b302b] pt-5">
                <h2 className="font-mono-tech text-xs uppercase tracking-wider text-[#a4aaa2]">
                  Sources and references
                </h2>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-[#a4aaa2]">
                  {issue.sources.map((s) => (
                    <li key={s.url}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2 hover:text-[#e9e5db]"
                      >
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        </article>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs">
          {olderIssue ? (
            <Link
              href={`/newsletter/${olderIssue.slug}`}
              className="inline-flex items-center gap-1.5 rounded border border-[#2b302b] bg-[#151815] px-3.5 py-2 text-[#e9e5db] hover:border-[#ffd200] hover:text-[#e9e5db]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {olderIssue.title}
            </Link>
          ) : (
            <Link
              href="/newsletter"
              className="inline-flex items-center gap-1.5 rounded border border-[#2b302b] bg-[#151815] px-3.5 py-2 text-[#e9e5db] hover:border-[#ffd200] hover:text-[#e9e5db]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All monthly updates
            </Link>
          )}

          {newerIssue ? (
            <Link
              href={`/newsletter/${newerIssue.slug}`}
              className="inline-flex items-center gap-1.5 rounded border border-[#2b302b] bg-[#151815] px-3.5 py-2 text-[#e9e5db] hover:border-[#ffd200] hover:text-[#e9e5db]"
            >
              {newerIssue.title}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <Link
              href="/newsletter"
              className="inline-flex items-center gap-1.5 rounded bg-[#2b7f07] px-3.5 py-2 font-semibold text-white hover:bg-[#236a05]"
            >
              All monthly updates →
            </Link>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
