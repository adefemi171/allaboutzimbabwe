import Link from "next/link";
import { NewsletterForm } from "@/components/NewsletterForm";
import { ReportButton } from "@/components/ReportButton";
import { CONTACT_EMAIL } from "@/lib/site";

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-[#2b302b] bg-[#0c0e0c] py-10 text-[0.92rem] text-[#a4aaa2]">
      <div className="mx-auto grid w-[min(100%-2*clamp(1rem,4vw,3rem),72rem)] gap-8 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.7fr_1fr_1.3fr]">
        <div>
          <p className="font-bold text-[#e9e5db]">All About Zimbabwe</p>
          <p className="mt-2.5 leading-relaxed">
            General information for people living in or visiting Zimbabwe. It is not legal or tax advice. Rules change, so check official portals before acting.
          </p>
        </div>

        <div>
          <p className="mono">Site</p>
          <ul className="mt-2.5 space-y-1.5 text-[#e9e5db]">
            <li>
              <Link href="/guides" className="hover:underline">
                Guides
              </Link>
            </li>
            <li>
              <Link href="/harare" prefetch={false} className="hover:underline">
                Map
              </Link>
            </li>
            <li>
              <Link href="/atlas" className="hover:underline">
                10 Provinces
              </Link>
            </li>
            <li>
              <Link href="/places" className="hover:underline">
                Universities &amp; Icons
              </Link>
            </li>
            <li>
              <Link href="/tools" className="hover:underline">
                Tools
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:underline">
                About
              </Link>
            </li>
            <li>
              <Link href="/newsletter" className="hover:underline">
                Newsletter
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:underline">
                Contact
              </Link>
            </li>
            <li>
              <ReportButton
                topic="General Site Feedback"
                className="cursor-pointer underline decoration-1 underline-offset-4 hover:decoration-2"
              />
            </li>
          </ul>
        </div>

        <div>
          <p className="mono">Map data</p>
          <ul className="mt-2.5 space-y-1.5">
            <li>Buildings &amp; streets: © OpenStreetMap</li>
            <li>Provinces: all 10 Zimbabwe provinces</li>
            <li>Campuses: UZ, NUST, MSU, AU, CUT, HIT, BUSE, GZU, LSU</li>
            <li>Wonders: Victoria Falls &amp; Great Zimbabwe</li>
            <li>
              <Link href="/about#data" className="text-[#e9e5db] hover:underline">
                Sources and licences
              </Link>
            </li>
            <li>
              <Link href="/feedback" className="text-[#e9e5db] hover:underline">
                Community corrections log
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="mono">Newsletter</p>
          <p className="mt-2.5">What changed in the rules, and which guides are new.</p>
          <NewsletterForm id="footer-news-email" compact />
        </div>
      </div>

      <p className="mx-auto mt-9 w-[min(100%-2*clamp(1rem,4vw,3rem),72rem)] border-t border-[#2b302b] pt-4 text-xs">
        Made by Runeward Labs ·{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#e9e5db] hover:underline">
          {CONTACT_EMAIL}
        </a>
      </p>
    </footer>
  );
}
