import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Flag } from "lucide-react";
import { ReportButton } from "@/components/ReportButton";
import { SURVIVAL_GUIDES, getGuideBySlug } from "@/data/guides";

export function generateStaticParams() {
  return SURVIVAL_GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) return { title: "Guides" };
  return { title: guide.title, description: guide.summary };
}

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();

  const otherGuides = SURVIVAL_GUIDES.filter((g) => g.slug !== guide.slug).slice(0, 3);

  return (
    <>
      <Navbar />
      <main
        id="main"
        className="mx-auto w-[min(100%-2*clamp(1rem,4vw,3rem),72rem)] pt-[clamp(2.5rem,6vw,5rem)] pb-16"
      >
        <Link
          href="/guides"
          className="mono text-[#a4aaa2] no-underline hover:text-[#ffd200]"
        >
          ← All guides
        </Link>

        <header className="mt-5 max-w-[46rem] border-b border-[#2b302b] pb-8">
          <p className="mono text-[#ffd200]">
            {guide.category} · {guide.cityFocus} · {guide.readTime} · Checked{" "}
            {guide.updatedAt}
          </p>
          <h1 className="mt-3 text-[clamp(2.1rem,4.2vw,3.3rem)] font-black leading-[1.03] tracking-[-0.025em]">
            {guide.title}
          </h1>
          <p className="mt-4 text-[1.15rem] leading-relaxed text-[#a4aaa2]">
            {guide.summary}
          </p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-12">
          <article className="max-w-[40rem] space-y-9 lg:col-span-8">
            <div className="border-l-4 border-[#ffd200] bg-[#151815] px-5 py-4">
              <p className="mono text-[#ffd200]">Key takeaways</p>
              <ul className="mt-3 space-y-2.5 text-[0.98rem] leading-relaxed text-[#e9e5db]">
                {guide.keyTakeaways.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ffd200]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {guide.sections.map((sec) => (
              <section key={sec.id} id={sec.id} className="space-y-4">
                <h2 className="text-[1.65rem] font-extrabold tracking-tight">
                  {sec.heading}
                </h2>
                {sec.paragraphs.map((p, idx) => (
                  <p key={idx} className="leading-7 text-[#dadcd7]">
                    {p}
                  </p>
                ))}
                {sec.bullets && (
                  <ul className="space-y-2 border border-[#2b302b] bg-[#151815] p-5 text-[0.98rem] text-[#dadcd7]">
                    {sec.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ffd200]" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {sec.callout && (
                  <aside className="nld-callout px-4 py-3">
                    <p className="font-bold text-[#ffd200]">{sec.callout.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-[#e9e5db]">
                      {sec.callout.body}
                    </p>
                  </aside>
                )}
              </section>
            ))}

            {guide.sources.length > 0 && (
              <section id="sources" className="space-y-4">
                <h2 className="text-[1.65rem] font-extrabold tracking-tight">Sources</h2>
                <p className="text-sm leading-relaxed text-[#a4aaa2]">
                  Facts in this guide were checked against these pages on {guide.updatedAt}.
                  Fees and rules change, so open the source before you rely on a figure.
                </p>
                <ul className="space-y-2 border border-[#2b302b] bg-[#151815] p-5 text-[0.98rem] text-[#dadcd7]">
                  {guide.sources.map((src) => (
                    <li key={src.url} className="flex items-start gap-2.5">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ffd200]" />
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="nld-link break-words"
                      >
                        {src.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="flex flex-col items-start justify-between gap-4 border border-[#2b302b] bg-[#151815] p-5 sm:flex-row sm:items-center">
              <div>
                <p className="font-bold">Something outdated or wrong?</p>
                <p className="mt-0.5 text-sm text-[#a4aaa2]">
                  Submit a correction so others get accurate facts.
                </p>
              </div>
              <ReportButton
                topic={guide.shortTitle}
                category="wrong-info"
                className="nld-btn text-xs"
              >
                <Flag className="h-3.5 w-3.5" />
                Report Correction
              </ReportButton>
            </div>
          </article>

          <aside className="space-y-6 lg:col-span-4">
            <nav className="border border-[#2b302b] bg-[#151815] p-5" aria-label="On this page">
              <p className="mono">On this page</p>
              <ul className="mt-3 space-y-2 text-sm">
                {guide.sections.map((sec) => (
                  <li key={sec.id}>
                    <a
                      href={`#${sec.id}`}
                      className="text-[#dadcd7] no-underline hover:text-[#ffd200]"
                    >
                      {sec.heading}
                    </a>
                  </li>
                ))}
                {guide.sources.length > 0 && (
                  <li>
                    <a href="#sources" className="text-[#dadcd7] no-underline hover:text-[#ffd200]">
                      Sources
                    </a>
                  </li>
                )}
              </ul>
            </nav>

            <div className="border border-[#2b302b] bg-[#151815] p-5">
              <p className="mono text-[#ffd200]">The 3D map</p>
              <p className="mt-2 text-sm leading-relaxed text-[#a4aaa2]">
                Inspect Harare, Bulawayo, Mutare, and all 10 provinces in interactive OpenStreetMap voxels.
              </p>
              <Link href="/harare" className="nld-btn mt-4 text-sm">
                Open the map
              </Link>
            </div>

            <div className="border border-[#2b302b] bg-[#151815] p-5">
              <p className="mono">More guides</p>
              <div className="mt-3 space-y-3">
                {otherGuides.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/guides/${r.slug}`}
                    className="block border-b border-[#2b302b] pb-2.5 text-sm last:border-none last:pb-0 no-underline hover:text-[#ffd200]"
                  >
                    <span className="font-semibold text-[#e9e5db]">{r.shortTitle}</span>
                    <span className="mt-0.5 block text-xs text-[#a4aaa2]">{r.readTime}</span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
