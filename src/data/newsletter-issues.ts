interface NewsletterSection {
  heading: string;
  subheading?: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface NewsletterIssue {
  slug: string;
  title: string;
  date: string;
  publishedLabel: string;
  summary: string;
  intro: string;
  sections: NewsletterSection[];
  /** Pages that back the facts in this update. */
  sources: { label: string; url: string }[];
}

export const NEWSLETTER_ISSUES: NewsletterIssue[] = [
  {
    slug: "november-2026",
    title: "What's new in November 2026",
    date: "November 14, 2026",
    publishedLabel: "Published on November 14, 2026 · By Adefemi",
    summary:
      "All 10 provinces in 3D voxels, 9 flagship universities + Victoria Falls & Great Zimbabwe 3D maps, and rainy-season solar checks.",
    intro:
      "November brings the first warm afternoon thundershowers across Zimbabwe's Highveld as jacaranda blossoms give way to emerald summer canopies. It is also a busy month for travelers booking festive Victoria Falls trips, university students wrapping up semester exams, and homeowners prepping solar rigs for cloudier afternoons.",
    sections: [
      {
        heading: "What's new in Harare & Zimbabwe's cities",
        subheading: "Rainy-season prep, solar checks & summer festivals",
        paragraphs: [
          "Across Harare, Bulawayo, Marondera, and Mutare, early summer rains have arrived. Before December's heavier downpours settle in, residents are clearing roof gutters, checking borehole pump seals, and verifying inverter battery reserve levels for overcast afternoons.",
        ],
        bullets: [
          "Harare & Bulawayo parks: Harare Gardens, Mukuvisi Woodlands, and Centenary Park are turning lush green after the dry winter months.",
          "Domestic flights: fastjet flies Harare–Victoria Falls and Harare–Bulawayo daily; Air Zimbabwe is listed on Harare–Victoria Falls six days a week and on Harare–Bulawayo on Fridays only. Book early if flying for December.",
          "Victoria Falls flow: Water levels along the Zambezi are near their dry-season low (the lowest month is October). Devil's Pool is typically open mid-September to December, and low-water rafting runs July to early December.",
        ],
      },
      {
        heading: "What's new across Zimbabwe",
        subheading: "Connectivity, EcoCash & road corridors",
        paragraphs: [
          "Satellite internet keeps growing: regulator data shows satellite subscriptions rising from 3,814 to 86,488 between Q3 2024 and Q1 2026, while fibre subscriptions grew 8.9%. That makes remote work more practical outside central Harare and Bulawayo.",
          "The Harare–Masvingo–Beitbridge highway (now designated R1, formerly A4) is largely upgraded: 550 km of the 580 km rehabilitation was complete by 27 April 2026, with 30 km still outstanding.",
        ],
      },
      {
        heading: "What's new on All About Zimbabwe",
        paragraphs: [
          "This edition launches our full 21-world 3D voxel atlas for Zimbabwe—built from real OpenStreetMap building footprints, avenues, rivers, and granite kopjes.",
        ],
        bullets: [
          "Launched interactive 3D OpenStreetMap voxel maps for all 10 Zimbabwean provinces (Harare, Bulawayo, Mutare, Gweru, Masvingo, Lupane, Gwanda, Marondera, Chinhoyi, Bindura) with Street View & walking pedestrians.",
          "Added dedicated 3D worlds for UZ Mount Pleasant, NUST Bulawayo, MSU Gweru, Africa University, CUT, HIT, BUSE, GZU, LSU, Victoria Falls, and Great Zimbabwe.",
          "Opened the community corrections log so readers across Zimbabwe can report outdated USD rents, fares, or missing landmarks.",
        ],
      },
    ],
    sources: [
      {
        label: "OpenStreetMap contributors (building & street geometry)",
        url: "https://www.openstreetmap.org/copyright",
      },
      {
        label: "Wild Horizons: best time to visit Victoria Falls (16 Oct 2026)",
        url: "https://wildhorizons.co.za/best-time-to-visit-victoria-falls/",
      },
      { label: "Rome2rio: Harare to Victoria Falls", url: "https://www.rome2rio.com/s/Harare/Victoria-Falls" },
      { label: "Rome2rio: Harare to Bulawayo", url: "https://www.rome2rio.com/s/Harare/Bulawayo" },
      {
        label: "TechTrends: Starlink, satellite and fibre subscriptions in Zimbabwe (31 Aug 2026)",
        url: "https://techtrendske.co.ke/2026/08/31/starlink-zimbabwe-subscribers-fibre/",
      },
      {
        label: "The Anchor: Harare–Beitbridge highway progress (27 Apr 2026)",
        url: "https://www.theanchor.co.zw/?p=10622",
      },
    ],
  },
  {
    slug: "october-2026",
    title: "What's new in October 2026",
    date: "October 31, 2026",
    publishedLabel: "Published on October 31, 2026 · By Adefemi",
    summary:
      "Jacaranda bloom peak in Harare & Bulawayo, festive HRE–VFA flight tips, and EcoCash/InnBucks payment notes.",
    intro:
      "October—widely called 'Suicide Month' locally for its dry pre-rain heat—turns Harare's Avenues and Bulawayo's Suburbs into purple tunnels of blooming jacaranda trees. It is also the best month to lock in year-end flights and check USD/ZiG payment rails.",
    sections: [
      {
        heading: "What's new in Harare & Bulawayo",
        subheading: "Jacaranda season & outdoor walks",
        paragraphs: [
          "Harare's Josiah Chinamano Avenue, Montagu/Baines Avenues, and Africa Unity Square sit under thick purple canopies through mid-October. Early morning walks before 09:00 CAT offer crisp light and calm streets.",
        ],
        bullets: [
          "Harare Gardens & National Gallery of Zimbabwe weekend sculpture courtyard walks.",
          "Bulawayo Centenary Park & Suburbs jacaranda avenues.",
          "Festive domestic flights between Harare (HRE), Bulawayo (BUQ), and Victoria Falls (VFA) are worth booking early. fastjet flies Bulawayo–Victoria Falls four times a week.",
        ],
      },
      {
        heading: "What's new on All About Zimbabwe",
        paragraphs: [
          "We refreshed our Power & Solar guide with regional solar notes from Global Solar Atlas. Bulawayo, Harare and Mutare turn out to be within about 5% of each other on long-term panel yield.",
        ],
        bullets: [
          "Added regional solar sizing presets to our Tools calculator.",
          "Expanded USD vs. ZiG + EcoCash/InnBucks street-payment notes in the Money guide.",
        ],
      },
    ],
    sources: [
      {
        label: "Global Solar Atlas: long-term PV yield, Harare point",
        url: "https://api.globalsolaratlas.info/data/lta?loc=-17.8292,31.0522",
      },
      {
        label: "Global Solar Atlas: long-term PV yield, Mutare point",
        url: "https://api.globalsolaratlas.info/data/lta?loc=-18.9707,32.6709",
      },
      {
        label: "ATTA: fastjet Bulawayo–Victoria Falls route (25 Jul 2025)",
        url: "https://atta.travel/resource/fastjet-launches-new-domestic-route-linking-bulawayo-and-victoria-falls.html",
      },
    ],
  },
  {
    slug: "september-2026",
    title: "What's new in September 2026",
    date: "September 28, 2026",
    publishedLabel: "Published on September 28, 2026 · By Adefemi",
    summary:
      "Spring semester housing around UZ & NUST, Starlink setup notes, and ZINARA term renewals.",
    intro:
      "September brings warm spring days across the plateau, new university intakes in Harare, Bulawayo, Gweru, and Mutare, and ZINARA vehicle licence renewals, which run in four-month terms.",
    sections: [
      {
        heading: "Student & young-professional housing updates",
        paragraphs: [
          "Demand around Mount Pleasant (UZ), Belvedere (HIT), Bulawayo Suburbs/Kumalo (NUST), and Senga (MSU) picks up sharply in September. Expect one month's rent in advance plus a one-month refundable deposit, which is also the legal maximum.",
        ],
        bullets: [
          "Updated student and young-professional lease ranges in Mount Pleasant, Avondale, Belvedere, and Kumalo.",
          "Added Starlink hardware & Liquid Home fiber comparison notes for remote workers.",
          "Reminder: ZINARA vehicle licences run in terms of 4 months (or 6, 8, 10 or 12) and are paid at ZINARA offices, approved licensing agents, or ZINARA's online portal. A ZBC radio licence or exemption is now required before ZINARA issues the disc.",
        ],
      },
    ],
    sources: [
      { label: "ZINARA: vehicle licensing", url: "https://www.zinara.co.zw/services/licensing/" },
      {
        label: "The Herald: ZBC car radio licence explainer (16 Jul 2025)",
        url: "https://www.heraldonline.co.zw/explainer-what-you-need-to-know-about-the-zbc-car-radio-licence/",
      },
      {
        label: "Propzone: rent regulations and deposits (updated 6 Aug 2026)",
        url: "https://www.propzone.co.zw/en/knowledge-base/landlord-tenant/being-landlord-zimbabwe-rent-regulations-tenant-screening-eviction/",
      },
    ],
  },
  {
    slug: "august-2026",
    title: "What's new in August 2026",
    date: "August 30, 2026",
    publishedLabel: "Published on August 30, 2026 · By Adefemi",
    summary:
      "Peak dry-season safari guide (Hwange & Mana Pools), Matobo Hills hikes, and ZIDA startup checklists.",
    intro:
      "August falls in Zimbabwe's dry winter safari season—crisp mornings, clear skies, and wildlife gathering around Hwange's waterholes and Mana Pools' Zambezi floodplains.",
    sections: [
      {
        heading: "Dry-season travel & business updates",
        paragraphs: [
          "Between August and October, vegetation thins out in Hwange, Mana Pools, and Gonarezhou, which makes wildlife easier to spot. Victoria Falls is heading for its lowest water in October.",
        ],
        bullets: [
          "August–October is the usual game-viewing season along the Zambezi floodplains in Mana Pools and at Hwange waterholes.",
          "Updated Starting a Business guide with Companies Office (CIPZ) online company registration and ZIMRA ITF263 tax clearance steps.",
        ],
      },
    ],
    sources: [
      { label: "ZimParks (Zimbabwe Parks & Wildlife Management Authority)", url: "https://www.zimparks.org.zw/" },
      {
        label: "Wild Horizons: best time to visit Victoria Falls (16 Oct 2026)",
        url: "https://wildhorizons.co.za/best-time-to-visit-victoria-falls/",
      },
      {
        label: "ZIMRA: tax clearance certificate (ITF263)",
        url: "https://www.zimra.co.zw/news/2235-tax-clearance-certificate-itf263-2",
      },
      {
        label: "The Anchor: Companies Office registration under the COBE Act (17 Apr 2026)",
        url: "https://www.theanchor.co.zw/?p=10611",
      },
    ],
  },
];

export function getNewsletterBySlug(slug: string): NewsletterIssue | undefined {
  return NEWSLETTER_ISSUES.find((i) => i.slug === slug);
}
