import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { RouteTimeline } from "@/components/guides/RouteTimeline";
import { SURVIVAL_GUIDES } from "@/data/guides";

export const metadata: Metadata = {
  title: "Guides",
  description:
    "Step-by-step guides to moving to and living in Zimbabwe, in the order you need them: what to do, what to bring, and what it costs.",
};

export default function GuidesIndexPage() {
  const checked = "15 November 2026";

  return (
    <>
      <Navbar />
      <main
        id="main"
        className="mx-auto grid w-[min(100%-2*clamp(1rem,4vw,3rem),72rem)] gap-[clamp(2rem,6vw,6rem)] pt-[clamp(2.5rem,6vw,5rem)] pb-16 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
      >
        <header className="md:sticky md:top-24 md:self-start">
          <p className="mono">{SURVIVAL_GUIDES.length} guides</p>
          <h1 className="mt-3.5 max-w-[16em] text-[clamp(2.1rem,4.2vw,3.3rem)] font-black leading-[1.03] tracking-[-0.025em] text-[#e9e5db]">
            A move to Zimbabwe, in the order it happens
          </h1>
          <p className="mt-5 max-w-[40rem] text-[1.15rem] leading-relaxed text-[#a4aaa2]">
            Start at the top and work down. Each guide says what to do, what to
            bring, what it costs in USD or ZiG, and which official portals to use.
            Every guide ends with a list of its sources.
          </p>
          <p className="nld-callout mt-6 px-4 py-3 text-[0.95rem] leading-relaxed text-[#e9e5db]">
            The facts in these guides were checked against the sources listed in
            each guide on {checked}, and anything that could not
            be confirmed is marked as such, but no person has reviewed them yet. Spot
            something wrong? Use <strong>Report a problem</strong> on any guide.
          </p>
        </header>

        <RouteTimeline headingLevel={2} />
      </main>
      <Footer />
    </>
  );
}
