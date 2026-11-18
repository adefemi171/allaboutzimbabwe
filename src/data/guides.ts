interface GuideSection {
  id: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  callout?: {
    title: string;
    body: string;
  };
}

export interface GuideSource {
  label: string;
  url: string;
}

export interface SurvivalGuide {
  slug: string;
  aliases?: string[];
  title: string;
  shortTitle: string;
  category:
    | "arrival"
    | "housing"
    | "bureaucracy"
    | "money"
    | "mobility"
    | "utilities"
    | "business"
    | "health";
  cityFocus: "Nationwide" | "All 10 Provinces" | "Urban Hubs";
  readTime: string;
  /** Date the facts were last checked against `sources`. */
  updatedAt: string;
  summary: string;
  keyTakeaways: string[];
  sections: GuideSection[];
  /** Pages the facts in this guide were checked against. */
  sources: GuideSource[];
}

export const SURVIVAL_GUIDES: SurvivalGuide[] = [
  {
    slug: "moving-to-harare",
    aliases: ["moving-to-zimbabwe", "choosing-a-city"],
    title: "Moving to Zimbabwe: Choosing Between Harare, Bulawayo, Mutare, Vic Falls & Gweru",
    shortTitle: "Move to Zimbabwe",
    category: "arrival",
    cityFocus: "All 10 Provinces",
    readTime: "9 min read",
    updatedAt: "15 Nov 2026",
    summary:
      "How Zimbabwe's cities compare on living costs, solar/borehole infrastructure, pace of life, and your first 30 days—across Harare, Bulawayo, Mutare, Gweru, Masvingo, and Victoria Falls.",
    keyTakeaways: [
      "Harare drives finance, NGOs, and tech startups; Bulawayo is calmer, with rents roughly 30–40% lower on a 2025 agents' guide; Mutare & Vic Falls suit mountain/nature lifestyles.",
      "Rent is paid monthly, but the standard lease runs 12 months and is renewable. The legal maximum upfront is one month's rent in advance plus a one-month deposit.",
      "On Day 1, get an Econet or NetOne SIM and set up a mobile wallet (EcoCash, OneMoney or InnBucks).",
      "Always verify two essentials before signing any lease: solar/inverter backup and a functioning borehole or water tank.",
    ],
    sections: [
      {
        id: "comparing-cities",
        heading: "Comparing Zimbabwe's Provincial Capitals",
        paragraphs: [
          "Living in Zimbabwe feels noticeably different depending on which province you settle in. Harare has the most jobs and the highest rents, while Bulawayo, Mutare, Gweru, and Masvingo trade traffic for spacious gardens, lower rents, and tight-knit communities.",
          "A 2025 agents' guide put a 3-bedroom house at $1,000–$1,500 a month in Harare, $600–$900 in Bulawayo, $500–$800 in Mutare and $400–$700 in Gweru. Water differs too: in 2026 Bulawayo was supplying water four days a week, while Harare's shortages were blamed on treatment and pipe infrastructure rather than dam levels.",
        ],
        bullets: [
          "Harare (Harare Province): Corporate, diplomatic, and startup center. Jacaranda streets in Avondale, Belgravia, Borrowdale, and Mount Pleasant; brisk Highveld mornings May–August.",
          "Bulawayo (City of Kings): Wide geometric streets, sandstone architecture, NUST tech belt, lower congestion, and easy trips to Matobo Hills.",
          "Mutare (Manicaland): Mountain-rimmed gateway to Vumba and Nyanga—lush greenery, cooler mist, and Mozambique corridor trade.",
          "Gweru & Midlands: Highway midpoint between Harare and Bulawayo with affordable family housing. Passenger trains on this line are not running.",
          "Masvingo & Victoria Falls: Tourism and heritage hubs anchored by Great Zimbabwe, Lake Mutirikwi, and the Zambezi gorge. We could not find current long-term rental listings for either town.",
        ],
        callout: {
          title: "Explore all 10 provinces in 3D",
          body: "Open our 10 Provinces Atlas to inspect real OpenStreetMap 3D buildings, rent benchmarks, and solar/fiber profiles before choosing a neighborhood.",
        },
      },
      {
        id: "first-30-days",
        heading: "Your First 30 Days Checklist",
        paragraphs: [
          "Daily life in Zimbabwe runs smoothly once mobile money, connectivity, and backup power are in place.",
        ],
        bullets: [
          "Day 1–2: Pick up an Econet or NetOne SIM at an official shop; take your passport or National ID. Econet is the largest network, carrying about 87% of mobile data traffic in early 2026.",
          "Day 3–5: Register a mobile wallet such as EcoCash, OneMoney or InnBucks for everyday payments.",
          "Week 1: Open a USD and ZiG bank account. Ask the bank first which documents it needs; we could not confirm the requirements for foreigners.",
          "Week 2–4: Test water pressure, borehole pump schedule, and solar inverter capacity before locking in a long-term lease.",
        ],
      },
    ],
    sources: [
      {
        label: "Property.co.zw: How rentals work in Zimbabwe, 2025 guide (13 Oct 2025)",
        url: "https://www.property.co.zw/blog/how-do-rentals-work-in-zimbabwe-2025-guide-for-tenants-and-landlords",
      },
      {
        label: "Propzone: rent regulations, deposits and eviction (updated 6 Aug 2026)",
        url: "https://www.propzone.co.zw/en/knowledge-base/landlord-tenant/being-landlord-zimbabwe-rent-regulations-tenant-screening-eviction/",
      },
      {
        label: "CITE: POTRAZ Q1 2026 mobile data shares (20 Jul 2026)",
        url: "https://cite.org.zw/?p=63040",
      },
      {
        label: "Business Times: urban water supply in Harare and Bulawayo (6 Jun 2026)",
        url: "https://businesstimes.co.zw/water-woes-in-urban-areas-continue-despite-record-rainfall-season/",
      },
      {
        label: "ZINARA licensing page (lists EcoCash, OneMoney and InnBucks as payment channels)",
        url: "https://www.zinara.co.zw/services/licensing/",
      },
      {
        label: "Seat61: Zimbabwe train services (updated 2 Jun 2026)",
        url: "https://seat61.com/Zimbabwe.htm",
      },
    ],
  },
  {
    slug: "renting-an-apartment",
    title: "Renting in Zimbabwe: Leases, Deposits, Boreholes & Solar Checks",
    shortTitle: "Rent an apartment",
    category: "housing",
    cityFocus: "All 10 Provinces",
    readTime: "8 min read",
    updatedAt: "15 Nov 2026",
    summary:
      "How residential leases work in Harare, Bulawayo, Mutare, and Gweru—including monthly rent, the legal limits on deposits and lease fees, estate levies, borehole water, and solar readiness.",
    keyTakeaways: [
      "Rent is paid monthly, but the standard lease term is 12 months, renewable. By law a landlord may ask upfront for no more than one month's rent in advance, a one-month deposit, and a lease fee of up to 5% of the first month's rent. Agents' guides say 1–2 months' deposit is asked in practice.",
      "A borehole with water tanks and a 3kVA–5kVA solar inverter are the standard quality-of-life checks in Harare and Bulawayo.",
      "Check the landlord's title deed, or that the estate agent is registered, before transferring a deposit.",
    ],
    sections: [
      {
        id: "move-in-math",
        heading: "Understanding Day-1 Move-In Costs",
        paragraphs: [
          "Zimbabwean landlords bill monthly rather than demanding a year upfront. On move-in day, expect the first month's rent, a refundable security deposit, and a lease-preparation fee. The Rent Regulations 2007 (SI 32 of 2007, section 27) cap the deposit at one month's rent and the lease fee at 5% of the first month's rent, and prohibit premiums or \"key money\". In practice agents commonly quote a flat US$50–200 admin fee.",
          "Since 31 July 2026 (SI 131 of 2026) rent must be quoted in legally acceptable currency; both USD and ZiG qualify. One agents' guide gives a worked example: a $700-a-month Avondale flat needs $1,500–$2,000 on day one, and extra costs add 20–50% to the rent.",
        ],
        bullets: [
          "Avondale / Avenues / Belgravia (Harare): $450–$1,500/mo for 1–3 bed flats or cluster homes; furnished Avenues flats were listed up to $2,750.",
          "Borrowdale / Mount Pleasant / Highlands: $1,200–$3,000+/mo for full houses and gated clusters.",
          "Bulawayo (Suburbs / Hillside / Kumalo): $400–$1,500/mo. Few homes are listed online, so check live listings.",
          "Mutare / Gweru: $200–$750/mo for 2–3 bedroom houses. We could not find current listings to check Masvingo or Victoria Falls.",
        ],
        callout: {
          title: "Calculate exact move-in cash",
          body: "Use our Zimbabwe True Rent Calculator under Tools with presets for Harare, Bulawayo, Victoria Falls, Mutare, Gweru, and Masvingo.",
        },
      },
      {
        id: "utilities-checklist",
        heading: "The Zimbabwe Lease Inspection Checklist",
        paragraphs: [
          "Before signing, ask specifically who pays for ZESA prepaid tokens, municipal rates/refuse, complex levy (for cluster homes), and solar battery maintenance. Utilities are normally on top of the rent.",
        ],
        bullets: [
          "ZESA: roughly $30–$150+ a month; water: roughly $10–$50 a month (agents' guide, April 2026).",
          "Levies: about $20–$50 a month for flats and $50–$150 a month in gated estates.",
          "Water: ask about the borehole. In 2026 Bulawayo was supplying municipal water four days a week.",
          "Solar: a 3 kVA system typically runs 1–2 fridges, lights, laptops and a router; 5 kVA adds a borehole pump and microwave, but not a geyser or air conditioning.",
        ],
      },
      {
        id: "tenant-rights",
        heading: "Deposits, Increases & Evictions",
        paragraphs: [
          "The rules sit in the Rent Regulations 2007 under the Housing and Building Act [Chapter 22:07]. This is a summary, not legal advice.",
        ],
        bullets: [
          "The deposit must be refunded within 14 days of moving out unless the landlord gives written notice of damage in that time.",
          "Annual USD increases of 5–10% are typical. A tenant disputing an increase can apply to the Rent Board and stay at the old rent meanwhile.",
          "Expect to give 30–60 days' notice at the end of a lease; a month-to-month tenancy needs one calendar month's written notice.",
          "Eviction needs a Magistrates Court order carried out by the Messenger of Court. Lock-outs and cutting off utilities are unlawful.",
        ],
      },
    ],
    sources: [
      {
        label: "Propzone: rent regulations, deposits and eviction (updated 6 Aug 2026)",
        url: "https://www.propzone.co.zw/en/knowledge-base/landlord-tenant/being-landlord-zimbabwe-rent-regulations-tenant-screening-eviction/",
      },
      {
        label: "Property.co.zw: How rentals work in Zimbabwe, 2025 guide (13 Oct 2025)",
        url: "https://www.property.co.zw/blog/how-do-rentals-work-in-zimbabwe-2025-guide-for-tenants-and-landlords",
      },
      {
        label: "Property.co.zw: the true costs beyond monthly rent (21 Apr 2026)",
        url: "https://www.property.co.zw/blog/renting-in-zimbabwe-the-true-costs-beyond-monthly-rent",
      },
      {
        label: "Property.co.zw: complete guide to renting, rights, costs and contracts (10 Jul 2025)",
        url: "https://www.property.co.zw/blog/the-complete-guide-to-renting-property-in-zimbabwe-rights-costs-and-contracts",
      },
      {
        label: "Property.co.zw listings: Borrowdale houses (live 15 Nov 2026)",
        url: "https://www.property.co.zw/houses-for-rent/harare-north/borrowdale",
      },
      {
        label: "Property.co.zw listings: Mount Pleasant houses (live 15 Nov 2026)",
        url: "https://www.property.co.zw/houses-for-rent/harare-north/mount-pleasant",
      },
      {
        label: "Property.co.zw listings: Avenues flats (live 15 Nov 2026)",
        url: "https://www.property.co.zw/flats-apartments-for-rent/harare-cbd/avenues",
      },
      {
        label: "Property.co.zw listings: Bulawayo (live 15 Nov 2026)",
        url: "https://www.property.co.zw/property-for-rent/bulawayo",
      },
      {
        label: "Numbeo: cost of living in Mutare (28 Apr 2026)",
        url: "https://www.numbeo.com/cost-of-living/in/Mutare-Zimbabwe",
      },
      {
        label: "Numbeo: cost of living in Gweru (6 Sep 2026)",
        url: "https://www.numbeo.com/cost-of-living/in/Gweru-Zimbabwe",
      },
      {
        label: "Propzone: solar sizing and cost for Harare homes (updated 11 Jul 2026)",
        url: "https://www.propzone.co.zw/en/knowledge-base/market-investment/solar-power-harare-homes-sizing-cost/",
      },
      {
        label: "Business Times: urban water supply in Harare and Bulawayo (6 Jun 2026)",
        url: "https://businesstimes.co.zw/water-woes-in-urban-areas-continue-despite-record-rainfall-season/",
      },
    ],
  },
  {
    slug: "national-id-zinara-visas",
    title: "National ID, e-Passports, ZINARA & Zimbabwe Visas (KAZA / Residency)",
    shortTitle: "ID, Passports & Visas",
    category: "bureaucracy",
    cityFocus: "Nationwide",
    readTime: "7 min read",
    updatedAt: "15 Nov 2026",
    summary:
      "Navigating Zimbabwe Civil Registry National IDs, biometric e-Passports, ZINARA vehicle licensing, and visitor visas, the KAZA Univisa and permits.",
    keyTakeaways: [
      "The Civil Registry issues National IDs and biometric e-Passports. An ordinary e-passport costs US$170 and an emergency one US$270 (confirmed by the department in October 2025). Not every registry office handles e-passports, so check before you travel.",
      "Tourists visiting Victoria Falls & Livingstone can use the KAZA Univisa ($50), covering both Zimbabwe and Zambia for up to 30 days in any 12-month period.",
      "Vehicle licences are sold by ZINARA in terms of 4, 6, 8, 10 or 12 months. Since 15 July 2025 ZINARA only issues a licence disc if you hold a ZBC radio licence or exemption certificate.",
    ],
    sections: [
      {
        id: "civil-registry",
        heading: "National ID & Biometric e-Passports",
        paragraphs: [
          "The National Registration Card (ID) is the everyday identity document for Zimbabweans and permanent residents. Biometric e-Passports are processed only at designated offices. The most recent list we found (September 2024) had 14: Harare, Bulawayo, Gwanda, Gweru, Lupane, Marondera, Beitbridge, Chitungwiza, Hwange, Mazowe, Murewa, Zvishavane, Chinhoyi and Guruve. Mutare was planned at the time; we found no later list.",
        ],
        bullets: [
          "e-Passport fees: ordinary US$170 (US$150 plus a US$20 QR code fee); emergency US$270.",
          "Civil Registry: we could not find a working official website, so confirm locations, hours and ID fees at your nearest registry office.",
          "Department of Immigration (zimimmigration.gov.zw): the information site. e-Visas are applied for at evisa.gov.zw; work and residence permits use a separate e-Permits portal linked from the department's site.",
        ],
      },
      {
        id: "vehicles",
        heading: "ZINARA Vehicle Licences & Driving",
        paragraphs: [
          "ZINARA lists three ways to pay for a vehicle licence: its own offices, approved licensing agents, and its online portal. A ZBC car radio licence is compulsory for any vehicle fitted with a radio, working or not; published amounts for it conflict, so check with ZBC before you pay.",
        ],
        bullets: [
          "ZINARA licence fees per term (SI 67 of 2024, which ZINARA calls indicative): up to 1,500 kg US$40; 1,501–2,250 kg US$50; 2,251–3,000 kg US$60; 3,001–3,750 kg US$120.",
          "First-time vehicle registration was cut from US$500 to US$50 in January 2026.",
          "Foreign driving licences are valid only for a limited time and sources disagree on how long. After that you need a Zimbabwean licence from the Central Vehicle Registry; confirm the period before relying on it.",
          "Visiting with a foreign-registered vehicle: the Temporary Import Permit is for personal use, and the vehicle must leave on your first departure and within three months. The US$10 Road Access Fee at borders was abolished in July 2026; carbon tax and third-party insurance are still paid to ZIMRA.",
        ],
      },
      {
        id: "kaza-and-visas",
        heading: "Visitor Visas, KAZA Univisa & Work Permits",
        paragraphs: [
          "Zimbabwe sorts nationalities into three groups. Category A needs no visa. Category B gets a visa on arrival, paid at the port of entry, or can apply online in advance via the e-Visa portal (evisa.gov.zw). Category C must get the visa before travel. Check your category on the Department of Immigration site.",
          "The e-Visa portal says processing averages seven working days and advises applying at least three weeks ahead. Your passport must be valid for six months after arrival and have three blank pages.",
        ],
        bullets: [
          "Standard Category B fees at the port of entry: single entry US$30, double entry US$45, multiple entry US$55 (needs a supporting letter).",
          "UK and Ireland passports pay US$55 single or US$70 double; Canada pays US$75, single entry only (secondary source, updated November 2026).",
          "KAZA Univisa: US$50, issued in Zimbabwe at Harare airport, Victoria Falls airport, Victoria Falls border and Kazungula border. It also covers day trips to Botswana via Kazungula.",
          "A tourist visa does not allow work or business. Volunteering or missionary work over 30 days counts as work and needs a Temporary Employment Permit. We could not confirm current permit fees or validity; ask Immigration.",
        ],
      },
    ],
    sources: [
      { label: "Zimbabwe e-Visa portal", url: "https://www.evisa.gov.zw/" },
      { label: "Zimbabwe e-Visa portal: FAQ", url: "https://www.evisa.gov.zw/faq.html" },
      { label: "Department of Immigration", url: "https://www.zimimmigration.gov.zw/" },
      {
        label: "Department of Immigration: Category B countries",
        url: "https://www.zimimmigration.gov.zw/?p=7186",
      },
      {
        label: "Zimbabwe Embassy, Washington: visa fees",
        url: "https://zimembassydc.org/?p=168",
      },
      {
        label: "Great Zimbabwe Guide: visa requirements (updated November 2026)",
        url: "https://www.greatzimbabweguide.com/zimbabwe-visa-requirements/",
      },
      {
        label: "Zambia Department of Immigration: KAZA Univisa",
        url: "https://www.zambiaimmigration.gov.zm/kaza-univisa/",
      },
      {
        label: "UK government: Zimbabwe entry requirements",
        url: "https://www.gov.uk/foreign-travel-advice/zimbabwe/entry-requirements",
      },
      {
        label: "UK government: Living in Zimbabwe (updated 13 Jun 2024)",
        url: "https://www.gov.uk/guidance/living-in-zimbabwe",
      },
      { label: "ZINARA: vehicle licensing", url: "https://www.zinara.co.zw/services/licensing/" },
      {
        label: "The Herald: ZBC car radio licence explainer (16 Jul 2025)",
        url: "https://www.heraldonline.co.zw/explainer-what-you-need-to-know-about-the-zbc-car-radio-licence/",
      },
      {
        label: "The Herald: access fees scrapped, registration fees cut (28 Jul 2026)",
        url: "https://www.heraldonline.co.zw/govt-scraps-duplicative-access-fees-in-transport-sector/",
      },
      {
        label: "ZIMRA: temporary importation of visitors' vehicles",
        url: "https://www.zimra.co.zw/news/2271:conditions-governing-the-temporary-importation-for-visitors-vehicles",
      },
      {
        label: "The Observer: Civil Registry confirms e-passport fees (13 Oct 2025)",
        url: "https://theobserverzim.co.zw/?p=23968",
      },
      {
        label: "Bulawayo24: e-passport offices (29 Sep 2024)",
        url: "https://bulawayo24.com/index-id-news-sc-national-byo-246104.html",
      },
    ],
  },
  {
    slug: "banking-ecocash-zig",
    title: "Money in Zimbabwe: USD, ZiG, EcoCash, InnBucks & Banking",
    shortTitle: "Money & EcoCash",
    category: "money",
    cityFocus: "Nationwide",
    readTime: "6 min read",
    updatedAt: "15 Nov 2026",
    summary:
      "How Zimbabwe's multi-currency economy works in practice—carrying clean small USD bills, mobile wallets such as EcoCash and InnBucks, bank charges, and the transfer tax.",
    keyTakeaways: [
      "The US Dollar (USD) and Zimbabwe Gold (ZiG) circulate side-by-side; USD is accepted for most transactions. Both are written with \"$\", so check which one a price is in.",
      "Carry small USD denominations ($1, $5, $10, $20)—change is scarce and torn notes are often refused.",
      "Mobile wallets such as EcoCash, OneMoney and InnBucks cut down on change headaches.",
    ],
    sections: [
      {
        id: "usd-and-wallets",
        heading: "USD Cash + Mobile Wallets",
        paragraphs: [
          "The ZiG replaced the Zimbabwean dollar in April 2024, and the USD remains legal tender. Change for large notes can be scarce, so locals combine small USD notes with a mobile wallet such as EcoCash, OneMoney or InnBucks. Wallet limits change; check the current ones in the app.",
          "Many businesses prefer USD cash, some medical providers do not take cards, and international cards can fail for cash withdrawals because USD cash is scarce.",
        ],
        bullets: [
          "Exchange money only at licensed dealers. The official rate was about ZiG 26.6 per US$1 in mid-August 2026, with the parallel rate about 20% higher; both move.",
          "Transfer tax (IMTT): 1.5% on ZiG transfers from 1 January 2026, and 2% on USD transfers.",
          "Declare US$10,000 or more in cash when you enter. It is illegal to leave with more than US$2,000 in cash.",
          "New ZiG10, ZiG20 and ZiG50 notes entered circulation on 7 April 2026; old notes remain valid.",
        ],
      },
      {
        id: "commercial-banks",
        heading: "Commercial Banks & Charges",
        paragraphs: [
          "Banks hold both USD (foreign currency) and ZiG accounts. We could not confirm each bank's account types, cards or what a foreigner needs to open one, so ask the bank directly. The same goes for remittance services: compare their current fees yourself.",
          "In February 2026 the Reserve Bank dropped the fixed 2030 date for ending the multi-currency system and tied it to conditions instead; the governor said USD contracts and foreign currency accounts continue unchanged.",
        ],
        bullets: [
          "Cash withdrawal limit: ZiG10,000 a week for individuals (2026 Monetary Policy Statement).",
          "Cash withdrawal charges are capped at 2%, at ATMs and in banking halls, in USD and ZiG.",
          "Card (POS) charges are capped at 1.5%, to a maximum of US$20, for local and international cards.",
          "No monthly fees on balances of US$100 or less, no charges on transactions of US$5 or less, and no balance enquiry fees.",
        ],
      },
    ],
    sources: [
      {
        label: "UK government: Zimbabwe safety and security (money advice)",
        url: "https://www.gov.uk/foreign-travel-advice/zimbabwe/safety-and-security",
      },
      {
        label: "UK government: Living in Zimbabwe (updated 13 Jun 2024)",
        url: "https://www.gov.uk/guidance/living-in-zimbabwe",
      },
      {
        label: "UK government: Zimbabwe entry requirements (cash limits)",
        url: "https://www.gov.uk/foreign-travel-advice/zimbabwe/entry-requirements",
      },
      {
        label: "The Herald: RBZ 2026 Monetary Policy Statement measures (28 Feb 2026)",
        url: "https://www.heraldonline.co.zw/rbz-announces-measures-to-boost-zig-price-stability/",
      },
      {
        label: "Nehanda Radio: RBZ drops 2030 multi-currency deadline (27 Feb 2026)",
        url: "https://nehandaradio.com/2026/02/27/rbz-abandons-2030-multi-currency-deadline-unveils-new-zig-banknotes/",
      },
      {
        label: "AllAfrica: new ZiG notes enter circulation (7 Apr 2026)",
        url: "https://allafrica.com/stories/202604070149.html",
      },
      {
        label: "The Herald: IMTT cut to 1.5%, VAT up 0.5% (28 Nov 2025)",
        url: "https://www.heraldonline.co.zw/imtt-cut-to-15pc-as-vat-inches-up-05pc/",
      },
      {
        label: "Equity Axis: weekly currency update (15 Aug 2026)",
        url: "https://equityaxis.net/post/19347/2026/8/weekly-currency-update-zig-holds-the-line-as-foreign-currency-inflows-carry-the-loa",
      },
      {
        label: "ZINARA licensing page (lists EcoCash, OneMoney and InnBucks as payment channels)",
        url: "https://www.zinara.co.zw/services/licensing/",
      },
      { label: "ZIMRA", url: "https://www.zimra.co.zw/" },
    ],
  },
  {
    slug: "getting-around-harare",
    aliases: ["getting-around-zimbabwe", "transit"],
    title: "Getting Around Zimbabwe: Kombis, inDrive & Bolt, Coaches, Flights & Rail",
    shortTitle: "Get around Zimbabwe",
    category: "mobility",
    cityFocus: "All 10 Provinces",
    readTime: "8 min read",
    updatedAt: "15 Nov 2026",
    summary:
      "Navigating Harare and Bulawayo streets, ride-hailing (inDrive, Bolt), intercity coaches (City Link, CAG, Eagle Liner), domestic flights, and the one passenger train still running.",
    keyTakeaways: [
      "For point-to-point urban rides, use inDrive (you propose a fare and drivers accept or counter) or Bolt (the app sets the fare).",
      "Kombis carry most urban commuters into the central ranks; ZUPCO bus service is limited. Harare kombi fares were about $1–$2 a trip in 2026, up to $3 at peak; Bulawayo and Mutare about $0.50–$1.",
      "fastjet flies Harare–Bulawayo (about 55 min) and Harare–Victoria Falls (about 70 min) daily. By road, City Link charges $35 Harare–Bulawayo and coaches take about 6 hours.",
    ],
    sections: [
      {
        id: "urban-mobility",
        heading: "Urban Transit in Harare, Bulawayo & Mutare",
        paragraphs: [
          "Kombis and informal taxis dominate city transport. Harare fares doubled from $1 to $2 on many routes in 2026 after fuel price rises, with $2–$2.50 to Chitungwiza or Norton. A private consortium is importing 700 urban buses for Harare, Bulawayo, Mutare and Masvingo, and Harare's council has proposed phasing out kombis by 2028.",
          "Ride-hailing is the easiest option for newcomers. In September 2026 Cabinet named Bolt, inDrive, Tap & Go, GoFaster and KOSE as e-hailing operators while regulations are being written. Hwindi is still listed as a working app, but with technical issues and limited coverage.",
        ],
        bullets: [
          "inDrive: you bid a fare; drivers accept or counter. Bolt: the app sets the fare.",
          "Taxis in Harare start at about $4 plus $2 per km (Numbeo, November 2026); Bulawayo starts at about $3.",
        ],
      },
      {
        id: "intercity",
        heading: "Intercity Highways, Coaches, Flights & Rail",
        paragraphs: [
          "The A5 highway links Harare–Gweru–Bulawayo (440 km, about 4.5 hours' driving or 6 hours by coach), the A3 climbs through Marondera to Mutare (263 km, about 4.5 hours by coach), and the A4 (now designated R1) runs south via Masvingo to Beitbridge (582 km). By April 2026, 550 km of the 580 km Harare–Beitbridge rehabilitation was complete.",
          "fastjet flies Harare–Bulawayo and Harare–Victoria Falls daily, and Bulawayo–Victoria Falls four times a week (Monday, Wednesday, Friday, Sunday). Air Zimbabwe is listed on Harare–Victoria Falls six days a week, and on Harare–Bulawayo and Bulawayo–Victoria Falls on Fridays only. Check the airline for fares.",
        ],
        bullets: [
          "Harare–Bulawayo coaches: City Link, CAG Travellers Coaches, Eagle Liner, Bravo Tours and Extracity, from Roadport. City Link's fare is $35 (also $30 to Gweru or Kwekwe).",
          "Harare–Mutare: CAG runs five departures a day from Mbare Musika.",
          "Harare–Victoria Falls by coach takes 13.5–16 hours; Bulawayo–Victoria Falls (438 km) about 6–8.5 hours.",
          "Rail: the only passenger train running is the weekly NRZ Bulawayo–Victoria Falls sleeper, restarted in October 2025. It leaves Bulawayo on Friday at 19:00 and Victoria Falls on Sunday at 19:00. A first-class berth is about $18 and economy $9; there is no catering and it often runs 1–4 hours late. Harare–Bulawayo passenger trains are not running.",
        ],
      },
      {
        id: "driving",
        heading: "Driving: Tolls & Fuel",
        paragraphs: [
          "Avoid driving outside towns at night, and expect some roads to become impassable in the rainy season (November–April).",
        ],
        bullets: [
          "Tolls for a light vehicle: US$4 on the premium roads (Harare–Beitbridge and Plumtree–Mutare) and US$3 on other national roads. Motorcycles are exempt.",
          "Fuel: ZERA sets maximum pump prices and reviews them about every two weeks. From 9 October 2026: diesel $2.04 a litre, E20 petrol $2.05.",
          "Vehicles entering at the border no longer pay the US$10 Road Access Fee (abolished July 2026); tolls remain.",
        ],
      },
    ],
    sources: [
      { label: "Rome2rio: Harare to Bulawayo", url: "https://www.rome2rio.com/s/Harare/Bulawayo" },
      { label: "Rome2rio: Harare to Mutare", url: "https://www.rome2rio.com/s/Harare/Mutare" },
      {
        label: "Rome2rio: Harare to Victoria Falls",
        url: "https://www.rome2rio.com/s/Harare/Victoria-Falls",
      },
      {
        label: "Rome2rio: Bulawayo to Victoria Falls",
        url: "https://www.rome2rio.com/s/Bulawayo/Victoria-Falls",
      },
      { label: "Rome2rio: Harare to Beitbridge", url: "https://www.rome2rio.com/s/Harare/Beitbridge" },
      { label: "City Link Coaches: routes and fares", url: "https://www.citylinkcoaches.co.zw/routes-fares" },
      {
        label: "Great Zimbabwe Guide: coach, bus and shuttle transfers (2026)",
        url: "https://www.greatzimbabweguide.com/coach-bus-and-shuttle-transfers-in-zimbabwe/",
      },
      { label: "Seat61: Zimbabwe train services (updated 2 Jun 2026)", url: "https://seat61.com/Zimbabwe.htm" },
      {
        label: "ATTA: fastjet Bulawayo–Victoria Falls route (25 Jul 2025)",
        url: "https://atta.travel/resource/fastjet-launches-new-domestic-route-linking-bulawayo-and-victoria-falls.html",
      },
      { label: "Post on Sunday: kombi fares (19 Apr 2026)", url: "https://postonsunday.co.zw/?p=9882" },
      {
        label: "The Herald: 700 new buses for Harare commuters (28 Jun 2026)",
        url: "https://www.heraldonline.co.zw/from-chaos-to-order-can-700-new-buses-fix-harares-commuter-nightmare/",
      },
      {
        label: "Zimbabwe Now: ZPTO and urban transport (11 Jun 2026)",
        url: "https://zimbabwenow.co.zw/articles/22945/can-zpto-succeed-where-zupco-failed-zimbabwes-latest-gamble-on-urban-transport",
      },
      {
        label: "Equity Axis: Cabinet's e-hailing transition (9 Sep 2026)",
        url: "https://equityaxis.net/post/19447/2026/9/zimbabwe-gives-indrive-tap-go-and-bolt-five-months-to-build-a-sustainable-ride-hailing-model",
      },
      {
        label: "ibZim: taxi apps that work in Zimbabwe (updated 12 Nov 2026)",
        url: "https://www.ibzim.com/travel/rankings/best-taxi-apps-that-work-zimbabwe",
      },
      { label: "Numbeo: cost of living in Harare (6 Nov 2026)", url: "https://www.numbeo.com/cost-of-living/in/Harare" },
      { label: "Numbeo: cost of living in Bulawayo (3 Jul 2026)", url: "https://www.numbeo.com/cost-of-living/in/Bulawayo" },
      {
        label: "Numbeo: cost of living in Mutare (28 Apr 2026)",
        url: "https://www.numbeo.com/cost-of-living/in/Mutare-Zimbabwe",
      },
      { label: "ZINARA (toll fees)", url: "https://www.zinara.co.zw/" },
      { label: "Kweli: ZERA fuel prices (updated 11 Oct 2026)", url: "https://www.kweli.co.za/?p=3032" },
      {
        label: "The Herald: access fees scrapped (28 Jul 2026)",
        url: "https://www.heraldonline.co.zw/govt-scraps-duplicative-access-fees-in-transport-sector/",
      },
      {
        label: "The Anchor: Harare–Beitbridge highway progress (27 Apr 2026)",
        url: "https://www.theanchor.co.zw/?p=10622",
      },
      { label: "Wikipedia: A4 road (Zimbabwe)", url: "https://en.wikipedia.org/wiki/A4_road_(Zimbabwe)" },
      { label: "Wikipedia: Transport in Zimbabwe", url: "https://en.wikipedia.org/wiki/Transport_in_Zimbabwe" },
      {
        label: "UK government: Zimbabwe safety and security",
        url: "https://www.gov.uk/foreign-travel-advice/zimbabwe/safety-and-security",
      },
    ],
  },
  {
    slug: "power-solar-internet",
    title: "ZESA Power, Solar & Inverter Sizing, Starlink & Fiber",
    shortTitle: "Power & Internet",
    category: "utilities",
    cityFocus: "Nationwide",
    readTime: "8 min read",
    updatedAt: "15 Nov 2026",
    summary:
      "Managing ZESA prepaid tokens and outages, sizing a LiFePO4 lithium + solar system, and choosing between fiber, TelOne, and Starlink.",
    keyTakeaways: [
      "Solar works well everywhere: long-term yield is about 4.8–5.1 kWh per kWp per day across the provincial capitals, dipping to about 4.1–4.5 in December–January (Global Solar Atlas).",
      "A 5kVA hybrid inverter with a lithium battery typically covers several fridges, a borehole pump, microwave, router and workstations, but not a geyser or air conditioning. Installed in Harare it cost $2,500–$5,500 in July 2026.",
      "Starlink has been licensed in Zimbabwe since 6 September 2024, alongside TelOne fibre and Blaze LTE and Liquid's fiber.",
    ],
    sections: [
      {
        id: "zesa-and-solar",
        heading: "ZESA Prepaid & Designing Your Solar Rig",
        paragraphs: [
          "ZESA (ZETDC) uses prepaid electricity meters—you buy tokens via EcoCash, OneMoney, Telecash, bank apps and USSD, Paynow, vendors, or ZESA offices. The tariff is stepped: the more you use in a month, the more each unit costs, and the bands reset on the 1st. Domestic customers are billed in ZiG at the prevailing rate.",
          "ZESA said on 28 October 2026 that the country had gone 304 days without scheduled load shedding; outages now come from faults and maintenance. Supply still leans on Hwange and Kariba, and Kariba's water allocation for 2027 has been cut, so drought years can bring load shedding back. That is why most homes keep a solar-and-battery backup.",
        ],
        bullets: [
          "Domestic tariff per kWh, before the 6% Rural Electrification levy (tracker dated 15 Nov 2026): first 50 kWh $0.08; 51–100 $0.09; 101–200 $0.16; 201–300 $0.23; 301–400 $0.25; above 400 $0.26.",
          "With the levy, 100 kWh costs about $9, 200 kWh about $26 and 300 kWh about $50.",
          "Installed solar prices in Harare with lithium batteries (July 2026): 3 kVA $1,000–$2,800; 5 kVA $2,500–$5,500; 8 kVA $3,500–$8,500.",
          "Panels sold in 2026 are 440–595 W each, so eight 550 W panels give about 4.4 kWp.",
        ],
      },
      {
        id: "internet-options",
        heading: "Fiber, LTE & Starlink Connectivity",
        paragraphs: [
          "Fiber is confirmed mainly for Harare and Bulawayo; older reports also list Victoria Falls, Mutare, Gweru and Masvingo. TelOne sells fibre (Speed 50, 80 and 100) and Blaze LTE. We could not confirm Liquid Home's current packages or coverage, so check with Liquid directly.",
          "Starlink covers the rest of the country, from farms and lodges to Eastern Highlands cottages. Its kits are sold as \"up to 100 Mbps\" (Mini) and \"up to 200 Mbps\" (Standard); those are maximums, not typical speeds. Harare and Bulawayo were listed as sold out from late 2024 and sources disagree on whether that has ended, so check availability and prices at starlink.com before you plan around it.",
        ],
        bullets: [
          "TelOne fibre per month (tariff effective 5 Aug 2025): Speed 50 (50 Mbps) $40; Speed 80 $60; Speed 100 $90. Unlimited plans carry a 3 TB fair-use policy.",
          "TelOne Blaze LTE (up to 25 Mbps): 75 GB $20; 150 GB $25; 500 GB $50; Unlimited $75.",
          "Starlink (last figures we could open, from late 2024): Residential $50 a month; Residential Lite $30 a month, slowed at peak times; Mini kit $200; Standard kit $389.",
          "Econet is the largest mobile network, with about 87% of mobile data traffic in early 2026.",
        ],
      },
    ],
    sources: [
      {
        label: "ZimPriceCheck: ZESA tariffs (15 Nov 2026)",
        url: "https://zimpricecheck.com/price-updates/zesa-tariffs/",
      },
      {
        label: "The Herald: Zimbabwe nears one year without load shedding (28 Oct 2026)",
        url: "https://www.heraldonline.co.zw/zim-nears-one-year-without-load-shedding/",
      },
      {
        label: "Global Solar Atlas: long-term PV yield, Harare point (opened 15 Nov 2026)",
        url: "https://api.globalsolaratlas.info/data/lta?loc=-17.8292,31.0522",
      },
      {
        label: "Propzone: solar sizing and cost for Harare homes (updated 11 Jul 2026)",
        url: "https://www.propzone.co.zw/en/knowledge-base/market-investment/solar-power-harare-homes-sizing-cost/",
      },
      {
        label: "TelOne: service tariffs effective 5 August 2025",
        url: "https://www.telone.co.zw/Products/Details/service-tariffs-effective-5-august-2025",
      },
      {
        label: "Techzim: POTRAZ licenses Starlink (Sep 2024)",
        url: "https://techzim.co.zw/2024/09/potraz-starlink-licence-disruption",
      },
      {
        label: "ZimPriceCheck: Starlink packages and pricing (11 Sep 2024)",
        url: "https://zimpricecheck.com/market-intelligence/starlink-revamps-internet-packages-in-zimbabwe-new-options-and-pricing",
      },
      {
        label: "Techzim: Starlink Standard kit price, Harare sold out (25 Oct 2024)",
        url: "https://techzim.co.zw/starlink-increases-standard-kit-price",
      },
      {
        label: "CleanTechnica: Starlink in Zimbabwe (22 Aug 2026)",
        url: "https://cleantechnica.com/2026/08/22/starlink-is-now-the-largest-isp-in-zimbabwe-by-subscriber-count/",
      },
      {
        label: "CITE: POTRAZ Q1 2026 mobile data shares (20 Jul 2026)",
        url: "https://cite.org.zw/?p=63040",
      },
    ],
  },
  {
    slug: "starting-a-business",
    title: "Starting a Business in Zimbabwe: Companies Office, ZIMRA & ZIDA",
    shortTitle: "Start a business",
    category: "business",
    cityFocus: "Nationwide",
    readTime: "7 min read",
    updatedAt: "15 Nov 2026",
    summary:
      "Registering a Private Limited Company (Pvt Ltd), ZIMRA registration and tax clearance (ITF263), ZIDA investment licensing, and employer obligations.",
    keyTakeaways: [
      "Companies register with the Companies Office under the Companies and Other Business Entities Act [Chapter 24:31], through its online portal (CIPZ). Existing companies must re-register by 20 April 2028.",
      "Foreign investors are licensed through ZIDA (Zimbabwe Investment and Development Agency): US$500 to apply and US$4,000 for the licence (2026 fees).",
      "Without a valid ZIMRA Tax Clearance Certificate (ITF263), customers must withhold 30% on contracts of US$1,000 or more. The certificate is generated free for compliant taxpayers.",
    ],
    sections: [
      {
        id: "registration",
        heading: "Incorporation, ZIMRA & Banking Steps",
        paragraphs: [
          "Start with a name search and reservation on the Companies Office (CIPZ) online portal, then register the company. Next open a corporate bank account and register on ZIMRA's TaRMS Self-Service Portal (mytaxselfservice.zimra.co.zw), which issues your Taxpayer Identification Number (TIN); BP numbers are the older identifier. Once you are compliant you can get the ITF263 tax clearance.",
          "We could not load the Companies Office portal or the NSSA site when checking, so confirm the portal address, form numbers and NSSA contribution rules with those offices directly.",
        ],
        bullets: [
          "Employers register for PAYE within 14 days and remit within 10 days of each month end.",
          "Corporate income tax is 25% plus an AIDS levy of 3% of the tax (25.75% effective).",
          "VAT is 15.5% from 1 January 2026. Registration is compulsory once taxable supplies reach US$25,000 (or the ZiG equivalent) in 12 months.",
          "Provisional tax (QPD) is due on 25 March (10%), 25 June (25%), 25 September (30%) and 20 December (35%); the annual return is due 30 April. Keep records for six years.",
          "ZIDA renewals and amendments cost US$3,000. ZIDA is at 1st Floor, ZB Life Towers, corner Jason Moyo and Sam Nujoma Street, Harare.",
        ],
      },
    ],
    sources: [
      {
        label: "ZIMRA: new businesses",
        url: "https://www.zimra.co.zw/domestic-taxes/corporate/new-businesses",
      },
      { label: "ZIMRA: taxpayer registration", url: "https://zimra.co.zw/news/2346:taxpayer-registration" },
      { label: "ZIMRA: corporate tax rates", url: "https://www.zimra.co.zw/domestic-taxes/corporate/tax-rates" },
      { label: "ZIMRA: VAT registration", url: "https://www.zimra.co.zw/domestic-taxes/vat/vat-registration" },
      {
        label: "ZIMRA: tax clearance certificate (ITF263)",
        url: "https://www.zimra.co.zw/news/2235-tax-clearance-certificate-itf263-2",
      },
      { label: "ZIDA: Zimbabwe Investment and Development Agency", url: "https://www.zidainvest.com/" },
      {
        label: "The Herald: investment licence fees cut (31 Mar 2026)",
        url: "https://www.heraldonline.co.zw/sez-investment-licence-fees-cut-to-woo-capital/",
      },
      {
        label: "The Anchor: company re-registration deadline extended (17 Apr 2026)",
        url: "https://www.theanchor.co.zw/?p=10611",
      },
      {
        label: "The Herald: IMTT cut to 1.5%, VAT up 0.5% (28 Nov 2025)",
        url: "https://www.heraldonline.co.zw/imtt-cut-to-15pc-as-vat-inches-up-05pc/",
      },
    ],
  },
  {
    slug: "healthcare-and-safety",
    title: "Healthcare, Medical Aid, Emergency Numbers & Safety",
    shortTitle: "Health & Safety",
    category: "health",
    cityFocus: "Nationwide",
    readTime: "6 min read",
    updatedAt: "15 Nov 2026",
    summary:
      "Private hospitals in Harare and Bulawayo, what to look for in medical cover, malaria and other health risks, and emergency contacts.",
    keyTakeaways: [
      "The US CDC lists all of Zimbabwe as a malaria transmission area and recommends antimalarials for travellers. Risk is lower on the Highveld (Harare, Bulawayo) and highest in the Zambezi valley and Lowveld; follow the CDC or your travel clinic.",
      "The private hospitals foreign embassies point to are The Avenues Clinic and Borrowdale Trauma Centre in Harare, and Mater Dei in Bulawayo.",
      "Private clinics may want payment up front, often in cash, even if you are insured. Choose cover that includes evacuation and treatment in South Africa.",
    ],
    sections: [
      {
        id: "clinics-and-aid",
        heading: "Hospitals, Medical Aid & Emergency Numbers",
        paragraphs: [
          "Keep emergency numbers saved: 112 from a mobile reaches ambulance, fire and police (114 on NetOne), and 0800 3222 911 from a landline. Emergency response is limited. For remote safari travel, ask your insurer or lodge for the current number of a private ambulance or air-evacuation service before you go.",
          "We could not verify the cover offered by individual local medical aid societies, so compare schemes directly and ask which hospitals accept them.",
        ],
        bullets: [
          "Harare: The Avenues Clinic (corner Baines Avenue and Mazowe Street); Borrowdale Trauma Centre (1 Borrowdale Lane); Parirenyatwa Hospital (public, Mazowe Street).",
          "Bulawayo: Mater Dei Hospital (Burns Drive, Malindela).",
          "Yellow fever: no vaccine is recommended for Zimbabwe itself, but proof of vaccination is required if you arrive from a risk country.",
          "Cholera: the CDC reported active transmission in parts of Manicaland, Mashonaland Central, Mashonaland East and Midlands (August 2026).",
          "Safety: avoid driving outside towns at night, and do not photograph government buildings, airports, military sites, police or protests—it is illegal.",
        ],
      },
    ],
    sources: [
      {
        label: "UK government: Zimbabwe, getting help (emergency numbers)",
        url: "https://www.gov.uk/foreign-travel-advice/zimbabwe/getting-help",
      },
      { label: "UK government: Zimbabwe, health", url: "https://www.gov.uk/foreign-travel-advice/zimbabwe/health" },
      {
        label: "UK government: Zimbabwe, safety and security",
        url: "https://www.gov.uk/foreign-travel-advice/zimbabwe/safety-and-security",
      },
      {
        label: "UK government: Living in Zimbabwe (updated 13 Jun 2024)",
        url: "https://www.gov.uk/guidance/living-in-zimbabwe",
      },
      {
        label: "US CDC: Zimbabwe traveller health (reviewed 25 Aug 2026)",
        url: "https://wwwnc.cdc.gov/travel/destinations/traveler/none/zimbabwe.htm",
      },
      {
        label: "France Ministry for Europe and Foreign Affairs: Zimbabwe useful contacts (15 Sep 2026)",
        url: "https://www.diplomatie.gouv.fr/fr/information-par-pays/zimbabwe/conseils-aux-voyageurs-contacts-utiles",
      },
    ],
  },
  {
    slug: "visiting-zimbabwe",
    title: "Visiting Zimbabwe: Victoria Falls, Great Zimbabwe, Safaris & Braai Culture",
    shortTitle: "Visit Zimbabwe",
    category: "arrival",
    cityFocus: "All 10 Provinces",
    readTime: "7 min read",
    updatedAt: "15 Nov 2026",
    summary:
      "The ultimate itinerary across Zimbabwe: Mosi-oa-Tunya, Hwange elephants, Mana Pools canoeing, Great Zimbabwe stone walls, Matobo rhinos, and Nyanga peaks.",
    keyTakeaways: [
      "The dry winter months (May–October) are the usual safari season around Hwange and Mana Pools. Victoria Falls is at peak flow March–May, highest in April, and lowest in October.",
      "Get the $50 KAZA Univisa on arrival at Victoria Falls Airport (VFA) if crossing into Livingstone, Zambia.",
      "Do not miss sadza ne nyama (braai), Mazowe orange crush, Tanganda tea, and live mbira or Sungura music.",
    ],
    sections: [
      {
        id: "classic-circuit",
        heading: "Zimbabwe's Classic North-to-South Circuit",
        paragraphs: [
          "Pair Harare's galleries and jacaranda cafes with Great Zimbabwe's medieval granite ruins in Masvingo, Matobo Hills' balancing boulders near Bulawayo, Hwange's elephant herds, and the mist of Victoria Falls—or escape east to the cloud forests of Nyanga and Vumba.",
        ],
        bullets: [
          "Victoria Falls Rainforest entry for international visitors: US$58 at the main gate (February 2026). Park fees change, so check ZimParks before you go.",
          "Low water at the Falls: Devil's Pool is typically open mid-September to December, and low-water rafting runs July to early December.",
          "Mana Pools is part of a UNESCO World Heritage property; its conservation fee is US$24 for international visitors.",
          "Entry: your passport must be valid for six months after arrival with three blank pages. A visa on arrival is usually granted for 30 days.",
        ],
      },
    ],
    sources: [
      { label: "ZimParks", url: "https://www.zimparks.org.zw/" },
      {
        label: "ZimParks: Victoria Falls National Park",
        url: "https://www.zimparks.org.zw/victoria-falls-national-park/",
      },
      { label: "ZimParks: Mana Pools National Park", url: "https://www.zimparks.org.zw/mana-pools-national-park/" },
      {
        label: "ATTA: ZimParks lifts Victoria Falls entry fees (13 Feb 2026)",
        url: "https://atta.travel/resource/zimparks-lifts-victoria-falls-entry-fees-as-vat-takes-effect.html",
      },
      {
        label: "Wild Horizons: best time to visit Victoria Falls (16 Oct 2026)",
        url: "https://wildhorizons.co.za/best-time-to-visit-victoria-falls/",
      },
      {
        label: "Zambia Department of Immigration: KAZA Univisa",
        url: "https://www.zambiaimmigration.gov.zm/kaza-univisa/",
      },
      { label: "Zimbabwe e-Visa portal", url: "https://www.evisa.gov.zw/" },
      {
        label: "UK government: Zimbabwe entry requirements",
        url: "https://www.gov.uk/foreign-travel-advice/zimbabwe/entry-requirements",
      },
    ],
  },
];

export function getGuideBySlug(slug: string): SurvivalGuide | undefined {
  return SURVIVAL_GUIDES.find((g) => g.slug === slug || g.aliases?.includes(slug));
}
