import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ReportButton } from "@/components/ReportButton";
import { CONTACT_EMAIL } from "@/lib/site";

const SOURCES = [
  {
    what: "Buildings, streets, water, parks and place names",
    source: "OpenStreetMap contributors",
    url: "https://www.openstreetmap.org/copyright",
    licence: "ODbL",
  },
  {
    what: "3D city and campus voxel worlds",
    source: "OpenStreetMap building footprints and roads, meshed into offline voxel bins for each province capital and campus",
    url: "https://www.openstreetmap.org/copyright",
    licence: "ODbL",
  },
  {
    what: "Where the universities and landmarks are",
    source: "A hand-curated selection of campuses and icons, checked against OpenStreetMap coordinates",
    url: "/places",
    licence: "Editorial selection",
  },
  {
    what: "Land on the home-page globe, neighbouring countries, large rivers",
    source: "Natural Earth",
    url: "https://www.naturalearthdata.com/",
    licence: "Public domain",
  },
  {
    what: "Guide facts on visas, IDs, tax and company filings",
    source: "Official portals where they loaded (Immigration, the e-Visa portal, ZIMRA, ZINARA, ZIDA, ZimParks), plus foreign-government travel advice, news reports and price trackers, all linked in the Sources list of each guide",
    url: "/guides",
    licence: "Public web pages, linked",
  },
] as const;

export const metadata: Metadata = {
  title: "About",
  description:
    "What All About Zimbabwe is, how the guides and the 3D map are made, where the data comes from, and how far to trust it.",
};

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main
        id="main"
        className="mx-auto w-[min(100%-2*clamp(1rem,4vw,3rem),72rem)] pt-[clamp(2.5rem,6vw,5rem)] pb-16"
      >
        <header>
          <p className="mono">About</p>
          <h1 className="mt-3.5 max-w-[16em] text-[clamp(2.1rem,4.6vw,3.4rem)] font-black leading-[1.03] tracking-[-0.025em]">
            What this site is, and how far to trust it
          </h1>
        </header>

        <div className="mt-0 max-w-[46rem]">
          <section className="mt-12 border-t border-[#2b302b] pt-5">
            <h2 className="text-[1.65rem] font-extrabold tracking-tight">What it is</h2>
            <p className="mt-4 max-w-[40rem] leading-relaxed text-[#a4aaa2]">
              All About Zimbabwe explains the paperwork of living in or moving to Zimbabwe in
              plain language: choosing a city, renting, national ID and visas, USD and ZiG money,
              kombis and long-distance travel, solar and ZESA, starting a business, and health
              cover. The{" "}
              <Link href="/guides" className="nld-link">
                guides
              </Link>{" "}
              are in the order you need them.
            </p>
            <p className="mt-4 max-w-[40rem] leading-relaxed text-[#a4aaa2]">
              The site is made by Runeward Labs. It is independent: it is not connected to the
              Government of Zimbabwe or to any of the organisations the guides are about. To get
              in touch, see the{" "}
              <Link href="/contact" className="nld-link">
                contact page
              </Link>
              .
            </p>
          </section>

          <section id="guides" className="mt-12 border-t border-[#2b302b] pt-5">
            <h2 className="text-[1.65rem] font-extrabold tracking-tight">How the guides are made</h2>
            <p className="mt-4 max-w-[40rem] leading-relaxed text-[#a4aaa2]">
              The guides were checked fact by fact on 15 November 2026. Where an official page
              loaded, such as Immigration, the e-Visa portal, ZIMRA,
              ZINARA or ZIDA, the fact was checked there. Where it did not, the check used
              foreign-government travel advice, news reports, and price or listing trackers. Each
              guide ends with a Sources list that links the individual pages, with their dates.
            </p>
            <p className="mt-4 max-w-[40rem] leading-relaxed text-[#a4aaa2]">
              No person has reviewed the guides yet. Until one has, the guides page carries a
              notice that says so. Where a figure could not be confirmed, or sources disagreed, the
              guide says that instead of giving a number. Spot something a source does not
              support? Say so with Report a problem.
            </p>
            <p className="mt-4 max-w-[40rem] leading-relaxed text-[#a4aaa2]">
              This is general information, not legal or tax advice. Fees, forms and rules change,
              often with budget announcements or statutory instruments. Before you act on
              something, open the linked source and check that it still says the same thing.
            </p>
          </section>

          <section id="report" className="mt-12 border-t border-[#2b302b] pt-5">
            <h2 className="text-[1.65rem] font-extrabold tracking-tight">If something is wrong</h2>
            <p className="mt-4 max-w-[40rem] leading-relaxed text-[#a4aaa2]">
              A fact that is wrong, a rule that has changed, a dead link, a street in the wrong
              place: please say so. There is a &quot;Report a problem&quot; link on every page, and the
              report says which page you were on.
            </p>
            <p className="mt-4">
              <ReportButton topic="Site Correction" />
            </p>
            <p className="mt-4 max-w-[40rem] leading-relaxed text-[#a4aaa2]">
              A report holds what you write, the issue type and topic you pick, the address of
              the page, and your email address if you choose to give one. Reports are saved
              privately; once reviewed they appear in the site&apos;s{" "}
              <Link href="/feedback" className="nld-link">
                corrections log
              </Link>
              , which never shows your email address. You can also write to{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="nld-link">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>

          <section id="map" className="mt-12 border-t border-[#2b302b] pt-5">
            <h2 className="text-[1.65rem] font-extrabold tracking-tight">How to read the map</h2>
            <p className="mt-4 max-w-[40rem] leading-relaxed text-[#a4aaa2]">
              The{" "}
              <Link href="/harare" className="nld-link">
                map
              </Link>{" "}
              shows Zimbabwe&apos;s provincial capitals and selected campuses as interactive 3D
              voxel cities built from real OpenStreetMap geometry. Start in Harare, or open any
              province from the atlas.
            </p>

            <dl className="mt-4 border-t-4 border-[#e9e5db]">
              {[
                {
                  title: "The buildings",
                  body: "Every block is a real OpenStreetMap building footprint, extruded into voxels. Heights are estimated from footprint size and OSM tags where available—they are a readable model, not a surveyor's elevation certificate.",
                },
                {
                  title: "The streets",
                  body: "Avenues, trunks and residential roads follow OSM centre-lines. Parks, rivers and rail appear where the map records them. Search first matches street and building names baked from that extract (plus the hand-picked landmark pins); house numbers and thin misses fall back to a live OpenStreetMap address lookup for Zimbabwe.",
                },
                {
                  title: "The places",
                  body: "Universities are marked with a purple square and landmarks with a yellow diamond. The list was put together by hand and is a selection—UZ, NUST, Great Zimbabwe, Victoria Falls and other icons—not a complete register of every campus or monument.",
                },
                {
                  title: "The people and vehicles",
                  body: "The figures walking the streets, and the kombis and cars, are made up. No data says who is where. They follow the roads and footpaths so the city feels lived-in, and there are fewer of them after dark. You can switch camera modes into street view, a kombi ride, or a river path where the data allows.",
                },
                {
                  title: "The light",
                  body: "By default the sun follows the clock on your device, so night on your phone is night on the map. You can drag the time and season sliders for a manual look, then return to the device clock when you want.",
                },
                {
                  title: "The globe",
                  body: "On the home page, the globe shows Zimbabwe and its neighbours with the real day–night line. It is a way into the story of the country, not a weather forecast.",
                },
                {
                  title: "Satellite view",
                  body: "Under Satellite view in the menu: lean Celestrak catalogs (resource, stations, weather) with SGP4 pass lists for the last and next week over each provincial capital, ground tracks on the globe and city 3D map, pass replay, and recent Sentinel-2 / Landsat photos from Earth Search when they match.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="grid gap-1 border-b border-[#2b302b] py-3 sm:grid-cols-[8rem_1fr] sm:gap-x-5"
                >
                  <dt className="font-bold text-[#e9e5db]">{item.title}</dt>
                  <dd className="m-0 leading-relaxed text-[#a4aaa2]">{item.body}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-4 max-w-[40rem] leading-relaxed text-[#a4aaa2]">
              Central Harare alone carries more than twelve thousand OSM buildings in the current
              extract. Other province and campus worlds are smaller windows centred on the capital
              or grounds. Gaps, missing roofs and odd footprints are usually gaps in OpenStreetMap
              itself—worth fixing upstream if you know the place.
            </p>
          </section>

          <section id="data" className="mt-12 border-t border-[#2b302b] pt-5">
            <h2 className="text-[1.65rem] font-extrabold tracking-tight">Where the data comes from</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[34rem] border-collapse text-[0.95rem] leading-snug">
                <thead>
                  <tr>
                    <th className="border-b-2 border-[#e9e5db] py-2.5 pr-4 text-left text-[0.85rem] font-bold">
                      What
                    </th>
                    <th className="border-b-2 border-[#e9e5db] py-2.5 pr-4 text-left text-[0.85rem] font-bold">
                      Source
                    </th>
                    <th className="border-b-2 border-[#e9e5db] py-2.5 text-left text-[0.85rem] font-bold">
                      Licence
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SOURCES.map((row) => (
                    <tr key={row.what}>
                      <td className="border-b border-[#2b302b] py-2.5 pr-4 align-top text-[#e9e5db]">
                        {row.what}
                      </td>
                      <td className="border-b border-[#2b302b] py-2.5 pr-4 align-top">
                        <Link
                          href={row.url}
                          className="nld-link"
                          {...(row.url.startsWith("http")
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {})}
                        >
                          {row.source}
                        </Link>
                      </td>
                      <td className="border-b border-[#2b302b] py-2.5 align-top text-[#a4aaa2]">
                        {row.licence}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
