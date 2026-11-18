import Link from "next/link";
import { SURVIVAL_GUIDES, type SurvivalGuide } from "@/data/guides";

const STAGES: {
  id: string;
  label: string;
  hint: string;
  slugs: string[];
}[] = [
  {
    id: "plan",
    label: "Plan",
    hint: "Before you move",
    slugs: ["moving-to-harare", "renting-an-apartment", "visiting-zimbabwe"],
  },
  {
    id: "arrive",
    label: "Arrive",
    hint: "Your first weeks",
    slugs: ["national-id-zinara-visas", "banking-ecocash-zig", "getting-around-harare"],
  },
  {
    id: "settle",
    label: "Settle",
    hint: "Once you are settled",
    slugs: ["power-solar-internet", "healthcare-and-safety", "starting-a-business"],
  },
];

export function RouteTimeline({ headingLevel = 3 }: { headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  let stepCounter = 0;

  return (
    <div className="relative">
      {STAGES.map((stage, stageIdx) => {
        const guides = stage.slugs
          .map((slug) => SURVIVAL_GUIDES.find((g) => g.slug === slug))
          .filter((g): g is SurvivalGuide => Boolean(g));
        const isFirst = stageIdx === 0;
        const isLast = stageIdx === STAGES.length - 1;

        return (
          <section
            key={stage.id}
            aria-labelledby={`stage-${stage.id}`}
            className="relative pl-11"
          >
            {/* Continuous vertical metro line */}
            <span
              aria-hidden="true"
              className={`absolute left-[1.02rem] w-1 bg-[#ffd200] ${
                isFirst ? "top-3 rounded-t-sm" : "top-0"
              } ${isLast ? "bottom-8 rounded-b-sm" : "bottom-0"}`}
            />

            <header
              className={`relative flex flex-wrap items-baseline gap-x-3 gap-y-0.5 pb-3.5 ${
                stageIdx > 0 ? "pt-6" : "pt-0.5"
              }`}
            >
              {/* Interchange circle on the metro rail */}
              <span
                aria-hidden="true"
                className="absolute -left-[2.2rem] bottom-4 h-5 w-5 rounded-full border-4 border-[#ffd200] bg-[#0c0e0c]"
              />
              <Heading
                id={`stage-${stage.id}`}
                className="text-2xl font-extrabold tracking-tight text-[#e9e5db]"
              >
                {stage.label}
              </Heading>
              <p className="mono">{stage.hint}</p>
            </header>

            <ol className="m-0 list-none p-0">
              {guides.map((guide) => {
                stepCounter += 1;
                const num = String(stepCounter).padStart(2, "0");
                return (
                  <li key={guide.slug}>
                    <Link
                      href={`/guides/${guide.slug}`}
                      className="group relative grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-0.5 border-t border-[#2b302b] py-3.5 pr-3 text-[#e9e5db] no-underline"
                    >
                      {/* Horizontal stop tick across the metro line */}
                      <span
                        aria-hidden="true"
                        className="absolute -left-[2.05rem] top-[1.4rem] h-1 w-3.5 rounded-sm bg-[#e9e5db] transition-all duration-150 group-hover:w-6 group-hover:bg-[#ffd200]"
                      />
                      <span
                        aria-hidden="true"
                        className="mono pt-1.5 text-[#a4aaa2]"
                      >
                        {num}
                      </span>
                      <span className="text-[1.15rem] font-bold leading-snug text-[#e9e5db] underline decoration-transparent decoration-2 underline-offset-4 transition-colors group-hover:decoration-[#ffd200]">
                        {guide.title}
                      </span>
                      <span className="col-start-2 max-w-[38rem] text-[0.95rem] leading-relaxed text-[#a4aaa2]">
                        {guide.summary}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
