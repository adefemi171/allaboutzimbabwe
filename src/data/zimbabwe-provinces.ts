export type ZimRegion =
  | "Harare Metro"
  | "Bulawayo Metro"
  | "Eastern Highlands"
  | "Central Midlands"
  | "Southern Lowveld"
  | "Northern Highveld"
  | "Zambezi & North";

/** Date the facts in this file were last checked against the listed sources. */
export const DATA_CHECKED = "2026-11-15";

export type AirportStatus = "scheduled" | "unconfirmed" | "charter" | "military" | "none";

export interface ProvinceAirport {
  /** IATA code of the province's main airport, or null when there is none. */
  code: string | null;
  name: string;
  status: AirportStatus;
  /** What actually flies there, or the nearest scheduled airport. */
  note: string;
}

export interface ProvinceSource {
  label: string;
  url: string;
}

/** Short badge for cards: never shows a bare code for an airport without scheduled flights. */
export function airportBadge(airport: ProvinceAirport): string {
  if (airport.status === "none" || !airport.code) return "No scheduled airport";
  if (airport.status === "scheduled") return airport.code;
  if (airport.status === "unconfirmed") return `${airport.code} · flights unconfirmed`;
  return `${airport.code} · ${airport.status}`;
}

const SRC_CENSUS: ProvinceSource = {
  label: "ZIMSTAT 2022 census, preliminary report (city figures)",
  url: "https://zimbabwe.unfpa.org/sites/default/files/pub-pdf/2022_population_and_housing_census_preliminary_report_on_population_figures.pdf",
};
const SRC_PROVINCES: ProvinceSource = {
  label: "Province totals (2022 census, final)",
  url: "https://en.wikipedia.org/wiki/Provinces_of_Zimbabwe",
};
const SRC_AIRPORTS: ProvinceSource = {
  label: "Airports in Zimbabwe",
  url: "https://en.wikipedia.org/wiki/List_of_airports_in_Zimbabwe",
};
const solarSource = (lat: number, lon: number): ProvinceSource => ({
  label: "Global Solar Atlas (PV yield)",
  url: `https://api.globalsolaratlas.info/data/lta?loc=${lat},${lon}`,
});
const wiki = (label: string, page: string): ProvinceSource => ({
  label,
  url: `https://en.wikipedia.org/wiki/${page}`,
});

interface ProvinceLandmark {
  id: string;
  name: string;
  lat: number;
  lon: number;
  elevationM: number;
  category: "landmark" | "district" | "bridge" | "transit" | "culture";
  summary: string;
  vibeNote: string;
  guideSlug: string;
}

export interface ZimbabweProvinceProfile {
  slug: string;
  province: string;
  capital: string;
  region: ZimRegion;
  lat: number;
  lon: number;
  /** Exact 2022 census figures; says whether each is the city or the province. */
  populationLabel: string;
  airport: ProvinceAirport;
  /** Elevation of the capital in metres above sea level (not a render height). */
  capitalElevationM?: number;
  /** A range backed by listings or Numbeo, otherwise "No current listing data". */
  rentMonthlyRange: string;
  /** Asking prices of houses for sale, built from listings the same way as rent. */
  salePriceRange?: string;
  powerScore: string;
  fiberStatus: string;
  tagline: string;
  transitLabel: string;
  sources: ProvinceSource[];
  accentColor: string;
  waterType: "river" | "lake" | "none";
  landmarks: ProvinceLandmark[];
  /** Optional granite/kopje monoliths to stamp into voxel terrain */
  rockFormations?: { lat: number; lon: number; radiusM: number; heightM: number }[];
}

export const ZIMBABWE_PROVINCES: ZimbabweProvinceProfile[] = [
  {
    slug: "harare",
    province: "Harare Province",
    capital: "Harare",
    region: "Harare Metro",
    lat: -17.8292,
    lon: 31.0522,
    populationLabel: "1,491,740 city · 2,427,231 province (2022 census)",
    airport: {
      code: "HRE",
      name: "Robert Gabriel Mugabe International",
      status: "scheduled",
      note: "Scheduled flights, including Fastjet domestic services to Bulawayo and Victoria Falls.",
    },
    capitalElevationM: 1483,
    rentMonthlyRange: "$350 – $3,500 / mo (39 listings sampled, Nov 2026)",
    salePriceRange: "$47,000 – $1,450,000 (19 listings sampled, Nov 2026)",
    powerScore: "ZESA grid + solar · PV yield 1,781 kWh/kWp/yr",
    fiberStatus: "Liquid / TelOne fibre · Starlink (urban sign-ups have been capacity-limited)",
    tagline: "The Sunshine City: jacaranda avenues, Eastgate biomimetic architecture, and Zimbabwe's financial & tech hub.",
    transitLabel: "Kombis, inDrive/Bolt & Taxis",
    sources: [
      SRC_CENSUS,
      SRC_PROVINCES,
      wiki("Harare airport", "Robert_Gabriel_Mugabe_International_Airport"),
      wiki("Harare", "Harare"),
      solarSource(-17.8292, 31.0522),
      { label: "Numbeo Harare rents", url: "https://www.numbeo.com/cost-of-living/in/Harare" },
      { label: "Borrowdale listings", url: "https://www.property.co.zw/houses-for-rent/harare-north/borrowdale" },
      { label: "Property.co.zw Harare houses to rent", url: "https://www.property.co.zw/houses-for-rent/harare" },
      { label: "Property.co.zw Harare flats to rent", url: "https://www.property.co.zw/flats-apartments-for-rent/harare" },
      { label: "Property.co.zw Harare houses for sale", url: "https://www.property.co.zw/houses-for-sale/harare" },
      { label: "Urban transport (Zimbabwe Now)", url: "https://zimbabwenow.co.zw/articles/22945/can-zpto-succeed-where-zupco-failed-zimbabwes-latest-gamble-on-urban-transport" },
    ],
    accentColor: "#4cb82a",
    waterType: "none",
    rockFormations: [{ lat: -17.8358, lon: 31.0355, radiusM: 170, heightM: 54 }],
    landmarks: [], // Uses full dataset in harare-landmarks.ts
  },
  {
    slug: "bulawayo",
    province: "Bulawayo Province",
    capital: "Bulawayo",
    region: "Bulawayo Metro",
    lat: -20.15,
    lon: 28.5833,
    populationLabel: "665,952 city and province (2022 census)",
    airport: {
      code: "BUQ",
      name: "Joshua Mqabuko Nkomo International",
      status: "scheduled",
      note: "Scheduled flights (Air Zimbabwe, Airlink, Ethiopian, Fastjet); about 15 km north of the city centre.",
    },
    capitalElevationM: 1358,
    rentMonthlyRange: "$400 – $2,000 / mo (15 listings, Nov 2026)",
    salePriceRange: "$33,000 – $350,000 (19 listings sampled, Nov 2026)",
    powerScore: "ZESA grid + solar · PV yield 1,846 kWh/kWp/yr",
    fiberStatus: "Liquid / TelOne fibre · Starlink (urban sign-ups have been capacity-limited)",
    tagline: "City of Kings: wide ox-wagon boulevards, colonial sandstone heritage, arts galleries, and calm urban rhythm.",
    transitLabel: "Kombis & City Taxis",
    sources: [
      SRC_CENSUS,
      SRC_PROVINCES,
      wiki("Bulawayo airport", "Joshua_Mqabuko_Nkomo_International_Airport"),
      wiki("Bulawayo", "Bulawayo"),
      solarSource(-20.15, 28.5833),
      { label: "Numbeo Bulawayo rents", url: "https://www.numbeo.com/cost-of-living/in/Bulawayo" },
      { label: "Bulawayo listings", url: "https://www.property.co.zw/property-for-rent/bulawayo" },
      { label: "Property.co.zw Bulawayo houses to rent", url: "https://www.property.co.zw/houses-for-rent/bulawayo" },
      { label: "Propertybook Bulawayo houses to rent", url: "https://www.propertybook.co.zw/houses/to-rent/bulawayo" },
      { label: "Propertybook Bulawayo flats to rent", url: "https://www.propertybook.co.zw/flats-apartments/to-rent/bulawayo" },
      { label: "Property.co.zw Bulawayo houses for sale", url: "https://www.property.co.zw/houses-for-sale/bulawayo" },
    ],
    accentColor: "#de2010",
    waterType: "none",
    landmarks: [
      {
        id: "byo-city-hall",
        name: "Bulawayo City Hall & Large City Hall",
        lat: -20.1558,
        lon: 28.5844,
        elevationM: 42,
        category: "landmark",
        summary: "Civic sandstone centerpiece along Fife Street and Leopold Takawira Avenue.",
        vibeNote: "Surrounded by wide tree-lined avenues built wide enough to turn an ox-wagon.",
        guideSlug: "moving-to-harare",
      },
      {
        id: "byo-museum",
        name: "Natural History Museum of Zimbabwe",
        lat: -20.1558,
        lon: 28.5964,
        elevationM: 32,
        category: "culture",
        summary: "Zimbabwe's natural history museum inside Centenary Park, opened in 1964.",
        vibeNote: "Famous for its colossal mounted African elephant and geology halls.",
        guideSlug: "visiting-zimbabwe",
      },
      {
        id: "byo-gallery",
        name: "National Gallery in Bulawayo",
        lat: -20.153,
        lon: 28.5829,
        elevationM: 30,
        category: "culture",
        summary: "Douslin House hosts contemporary Zimbabwean sculpture, textiles, and Matabeleland art.",
        vibeNote: "In the CBD on Leopold Takawira Avenue, in a building dating from 1901.",
        guideSlug: "visiting-zimbabwe",
      },
      {
        id: "byo-suburbs",
        name: "Suburbs & Kumalo",
        lat: -20.167,
        lon: 28.604,
        elevationM: 28,
        category: "district",
        summary: "Leafy, quiet residential belt beside Ascot Centre and Centenary Park.",
        vibeNote: "Popular for guesthouses, NGOs, and family homes with solar + boreholes.",
        guideSlug: "renting-an-apartment",
      },
    ],
  },
  {
    slug: "manicaland",
    province: "Manicaland Province",
    capital: "Mutare",
    region: "Eastern Highlands",
    lat: -18.9707,
    lon: 32.6709,
    populationLabel: "224,802 city · 2,037,703 province (2022 census)",
    airport: {
      code: "UTA",
      name: "Mutare Airport",
      status: "charter",
      note: "Charter only (950 m runway). Air Zimbabwe's Harare–Mutare–Victoria Falls flights, launched Sept 2025, use Grand Reef Aerodrome (FVGR, no IATA code) about 20 km west; no 2026 timetable found.",
    },
    capitalElevationM: 1120,
    rentMonthlyRange: "$200 – $850 / mo",
    salePriceRange: "$25,000 – $599,000 (20 listings, Nov 2026)",
    powerScore: "ZESA grid + solar · PV yield 1,759 kWh/kWp/yr",
    fiberStatus: "Starlink · fibre reported in older sources only",
    tagline: "Mountain-ringed border city opening onto the misty Vumba, Nyanga, and Chimanimani highlands.",
    transitLabel: "Mutare Kombis, Taxis & Beira Corridor",
    sources: [
      SRC_CENSUS,
      SRC_PROVINCES,
      wiki("Mutare Airport", "Mutare_Airport"),
      wiki("Grand Reef Aerodrome", "Grand_Reef_Airport"),
      { label: "Air Zimbabwe Mutare route (ATTA)", url: "https://atta.travel/resource/air-zimbabwe-announces-harare-mutare-victoria-falls-route-as-permanent.html" },
      wiki("Mutare", "Mutare"),
      solarSource(-18.9707, 32.6709),
      { label: "Numbeo Mutare rents", url: "https://www.numbeo.com/cost-of-living/in/Mutare-Zimbabwe" },
      { label: "Property.co.zw Mutare houses for sale", url: "https://www.property.co.zw/houses-for-sale/mutare" },
    ],
    accentColor: "#38bdf8",
    waterType: "none",
    rockFormations: [{ lat: -18.96, lon: 32.69, radiusM: 220, heightM: 75 }],
    landmarks: [
      {
        id: "mtr-civic",
        name: "Mutare Civic Centre & Herbert Chitepo St",
        lat: -18.972,
        lon: 32.6685,
        elevationM: 36,
        category: "district",
        summary: "Commercial heart of Mutare framed by the Cecil Kopje and Vumba mountain ridges.",
        vibeNote: "Clean mountain air, vibrant fruit markets, and Mozambique rail-port corridor.",
        guideSlug: "moving-to-harare",
      },
      {
        id: "mtr-museum",
        name: "Mutare Museum",
        lat: -18.971,
        lon: 32.6672,
        elevationM: 30,
        category: "culture",
        summary: "Transport, flora, and Eastern Highlands heritage museum on Aerodrome Road.",
        vibeNote: "Established in 1959.",
        guideSlug: "visiting-zimbabwe",
      },
      {
        id: "mtr-cecil-kop",
        name: "Cecil Kop & Tiger's Kloof Ridge",
        lat: -18.961,
        lon: 32.684,
        elevationM: 64,
        category: "landmark",
        summary: "Mountain wildlife reserve and panoramic granite ridge overlooking eastern Mutare.",
        vibeNote: "About 1,500 ha, 3 km from the CBD, run by Wildlife and Environment Zimbabwe; animal numbers are reported to be well down.",
        guideSlug: "visiting-zimbabwe",
      },
      {
        id: "mtr-sakubva",
        name: "Mutare Railway Station",
        lat: -18.9841,
        lon: 32.6633,
        elevationM: 28,
        category: "transit",
        summary: "Railway station on Railway Street, just south-west of the city centre.",
        vibeNote: "Sakubva Stadium is a separate site further south-west on the Mutare–Masvingo Road.",
        guideSlug: "getting-around-harare",
      },
    ],
  },
  {
    slug: "midlands",
    province: "Midlands Province",
    capital: "Gweru",
    region: "Central Midlands",
    lat: -19.45,
    lon: 29.8167,
    populationLabel: "161,292 city · 1,811,905 province (2022 census)",
    airport: {
      code: "GWE",
      name: "Gweru-Thornhill Air Base",
      status: "military",
      note: "Military air base with no scheduled passenger flights. Nearest scheduled airports: BUQ (Gweru–Bulawayo 164 km by road) or HRE (275 km).",
    },
    capitalElevationM: 1424,
    rentMonthlyRange: "$180 – $750 / mo",
    salePriceRange: "$25,000 – $200,000 (13 listings, Nov 2026)",
    powerScore: "ZESA grid + solar · PV yield 1,825 kWh/kWp/yr",
    fiberStatus: "Starlink · fibre reported in older sources only",
    tagline: "Zimbabwe's central crossroads linking Harare and Bulawayo—rail hub, university town, and chrome/gold belt.",
    transitLabel: "Intercity Coaches & Kombis",
    sources: [
      SRC_CENSUS,
      SRC_PROVINCES,
      wiki("Thornhill Air Base", "Thornhill_Air_Base"),
      wiki("Gweru", "Gweru"),
      solarSource(-19.45, 29.8167),
      { label: "Numbeo Gweru rents", url: "https://www.numbeo.com/cost-of-living/in/Gweru-Zimbabwe" },
      { label: "Property.co.zw Gweru houses for sale", url: "https://www.property.co.zw/houses-for-sale/gweru" },
      { label: "Rail status (Seat 61)", url: "https://seat61.com/Zimbabwe.htm" },
    ],
    accentColor: "#ffd200",
    waterType: "none",
    landmarks: [
      {
        id: "gwu-boggie",
        name: "Boggie Clock Tower & Robert Mugabe Way",
        lat: -19.4545,
        lon: 29.8169,
        elevationM: 34,
        category: "landmark",
        summary: "1928 landmark clock tower anchoring Gweru's orderly central business grid.",
        vibeNote: "Midpoint stop between Harare (275 km) and Bulawayo (164 km).",
        guideSlug: "getting-around-harare",
      },
      {
        id: "gwu-museum",
        name: "Zimbabwe Military Museum",
        lat: -19.4604,
        lon: 29.815,
        elevationM: 28,
        category: "culture",
        summary: "Historic aviation, armored vehicle, and national heritage collection.",
        vibeNote: "On Lobengula Avenue beside the Civic Centre; opened in 1974 as the Midlands Museum, renamed 1985.",
        guideSlug: "visiting-zimbabwe",
      },
      {
        id: "gwu-kudzanayi",
        name: "Kudzanayi Terminus & Gweru Station",
        lat: -19.4578,
        lon: 29.8105,
        elevationM: 24,
        category: "transit",
        summary: "Central Midlands coach terminus and National Railways of Zimbabwe junction.",
        vibeNote: "Connects intercity coaches between Harare, Bulawayo, Kwekwe, and Masvingo.",
        guideSlug: "getting-around-harare",
      },
      {
        id: "gwu-kopje",
        name: "Gweru Kopje & Windsor Park",
        lat: -19.4445,
        lon: 29.8255,
        elevationM: 32,
        category: "district",
        summary: "Elevated residential enclave overlooking Gweru CBD and civic parks.",
        vibeNote: "Popular for quiet family homes, guesthouses, and solar-backed offices.",
        guideSlug: "renting-an-apartment",
      },
    ],
  },
  {
    slug: "masvingo",
    province: "Masvingo Province",
    capital: "Masvingo",
    region: "Southern Lowveld",
    lat: -20.072,
    lon: 30.8342,
    populationLabel: "90,286 city · 1,638,528 province (2022 census)",
    airport: {
      code: "MVZ",
      name: "Masvingo Airport",
      status: "charter",
      note: "Charter and military use; 3 km east of the city. Air Zimbabwe flew here only on 5–12 Sept 2026 for the Sanganai expo; no permanent schedule confirmed.",
    },
    capitalElevationM: 1075,
    rentMonthlyRange: "No current listing data",
    salePriceRange: "$16,500 – $500,000 (17 listings, Nov 2026)",
    powerScore: "ZESA grid + solar · PV yield 1,763 kWh/kWp/yr",
    fiberStatus: "Starlink · fibre reported in older sources only",
    tagline: "Zimbabwe's oldest colonial town and the gateway to Great Zimbabwe National Monument & Lake Mutirikwi.",
    transitLabel: "A4 Highway Coaches & Town Taxis",
    sources: [
      SRC_CENSUS,
      { label: "Masvingo census profile (ZIMSTAT/UNICEF)", url: "https://www.unicef.org/zimbabwe/media/10466/file/MASVINGO%202022%20ZIM%20Census%20Province%20Profile_April%202024.pdf.pdf" },
      wiki("Masvingo Airport", "Masvingo_Airport"),
      { label: "Sanganai expo flights (ATTA)", url: "https://atta.travel/resource/air-zimbabwe-launches-masvingo-flights-to-support-sanganai-tourism-expo.html" },
      wiki("Masvingo", "Masvingo"),
      solarSource(-20.0744, 30.8328),
      { label: "Property.co.zw Masvingo houses for sale", url: "https://www.property.co.zw/houses-for-sale/masvingo" },
      { label: "Propertybook Masvingo houses for sale", url: "https://www.propertybook.co.zw/houses/for-sale/masvingo" },
    ],
    accentColor: "#ec4899",
    waterType: "river",
    rockFormations: [{ lat: -20.056, lon: 30.842, radiusM: 180, heightM: 58 }],
    landmarks: [
      {
        id: "mvz-cbd",
        name: "Masvingo CBD & Mucheke Bridge",
        lat: -20.068,
        lon: 30.825,
        elevationM: 30,
        category: "district",
        summary: "Quiet stone-country hub serving Great Zimbabwe University and Lowveld travelers.",
        vibeNote: "28 km northwest of the medieval dry-stone walls of Great Zimbabwe.",
        guideSlug: "visiting-zimbabwe",
      },
      {
        id: "mvz-civic",
        name: "Masvingo Civic Gardens & Hughes St",
        lat: -20.0622,
        lon: 30.8295,
        elevationM: 28,
        category: "landmark",
        summary: "Central administrative square linking Victoria St cafes and tourist lodges.",
        vibeNote: "Easy base for Lake Mutirikwi (Kyle) and Great Zimbabwe Ruins.",
        guideSlug: "visiting-zimbabwe",
      },
      {
        id: "mvz-target-kopje",
        name: "Rhodene",
        lat: -20.0565,
        lon: 30.8385,
        elevationM: 46,
        category: "district",
        summary: "Affluent low-density suburb in the north of Masvingo.",
        vibeNote: "Target Kopje, a middle-density suburb on a small hill, is on the southern side of town.",
        guideSlug: "renting-an-apartment",
      },
      {
        id: "mvz-mucheke-stadium",
        name: "Mucheke Stadium & Terminus",
        lat: -20.0725,
        lon: 30.8165,
        elevationM: 24,
        category: "transit",
        summary: "Provincial sports ground and main coach hub on the A4 Beitbridge highway.",
        vibeNote: "Connects Masvingo with Harare, Bulawayo, Chiredzi, and Beitbridge.",
        guideSlug: "getting-around-harare",
      },
    ],
  },
  {
    slug: "matabeleland-north",
    province: "Matabeleland North",
    capital: "Lupane",
    region: "Zambezi & North",
    lat: -18.9347,
    lon: 27.7728,
    populationLabel: "827,645 province · Lupane District 107,245 (2022 census)",
    airport: {
      code: "VFA",
      name: "Victoria Falls Airport",
      status: "scheduled",
      note: "Scheduled flights; 18 km south of Victoria Falls town. Lupane itself has only a small aerodrome.",
    },
    capitalElevationM: 976,
    rentMonthlyRange: "No current listing data",
    salePriceRange: "No current listing data",
    powerScore: "ZESA grid + solar · PV yield 1,843 kWh/kWp/yr",
    fiberStatus: "Starlink · no verified fibre coverage in Lupane",
    tagline: "Home to Victoria Falls (Mosi-oa-Tunya), Hwange National Park, teak forests, and Lupane provincial hub.",
    transitLabel: "A8 Vic Falls Highway, VFA Flights & Buses",
    sources: [
      SRC_CENSUS,
      SRC_PROVINCES,
      wiki("Victoria Falls Airport", "Victoria_Falls_Airport"),
      wiki("Lupane District", "Lupane_District"),
      solarSource(-18.9315, 27.807),
      { label: "Property.co.zw Lupane rentals (none listed)", url: "https://www.property.co.zw/property-for-rent/lupane" },
      { label: "Property.co.zw Lupane houses for sale (none listed)", url: "https://www.property.co.zw/houses-for-sale/lupane" },
    ],
    accentColor: "#a855f7",
    waterType: "river",
    landmarks: [
      {
        id: "lup-centre",
        name: "Lupane Provincial Hub & A8 Corridor",
        lat: -18.9315,
        lon: 27.807,
        elevationM: 28,
        category: "district",
        summary: "Provincial administrative capital midway along the Bulawayo–Victoria Falls highway.",
        vibeNote: "Surrounded by Kalahari sandveld teak forests and Lupane State University.",
        guideSlug: "moving-to-harare",
      },
      {
        id: "lup-gov-complex",
        name: "Matabeleland North Provincial Complex",
        lat: -18.928,
        lon: 27.8015,
        elevationM: 34,
        category: "landmark",
        summary: "Modern government and civil registry complex anchoring Lupane's planned town centre.",
        vibeNote: "Handles provincial IDs, land administration, and regional services.",
        guideSlug: "national-id-zinara-visas",
      },
      {
        id: "lup-st-lukes",
        name: "Lupane Business Centre & Bubi Bridge",
        lat: -18.9355,
        lon: 27.8125,
        elevationM: 24,
        category: "transit",
        summary: "Highway transit stop and commercial market serving travelers to Hwange & Vic Falls.",
        vibeNote: "170 km northwest of Bulawayo along the A8 tourist corridor.",
        guideSlug: "getting-around-harare",
      },
    ],
  },
  {
    slug: "matabeleland-south",
    province: "Matabeleland South",
    capital: "Gwanda",
    region: "Bulawayo Metro",
    lat: -20.9414,
    lon: 29.0037,
    populationLabel: "27,143 town · 760,345 province (2022 census)",
    airport: {
      code: null,
      name: "No airport in the province",
      status: "none",
      note: "None in the province; nearest is BUQ (Bulawayo). Gwanda is about 134 km by road from Bulawayo and the airport is about 15 km north of the city centre.",
    },
    capitalElevationM: 1000,
    rentMonthlyRange: "No current listing data",
    salePriceRange: "No current listing data",
    powerScore: "ZESA grid + solar · PV yield 1,744 kWh/kWp/yr",
    fiberStatus: "Starlink · no verified fibre coverage",
    tagline: "Granite Matobo Hills balancing rocks, goldfields, cattle country, and the Beitbridge southern gateway.",
    transitLabel: "Bulawayo–Beitbridge Highway & Taxis",
    sources: [
      SRC_CENSUS,
      SRC_PROVINCES,
      SRC_AIRPORTS,
      wiki("Gwanda", "Gwanda"),
      solarSource(-20.9333, 29.0),
      { label: "Property.co.zw Gwanda rentals (none listed)", url: "https://www.property.co.zw/property-for-rent/gwanda" },
      { label: "Propertybook Gwanda property for sale", url: "https://www.propertybook.co.zw/for-sale/gwanda" },
    ],
    accentColor: "#ffd200",
    waterType: "river",
    rockFormations: [{ lat: -20.928, lon: 29.018, radiusM: 180, heightM: 60 }],
    landmarks: [
      {
        id: "gwa-cbd",
        name: "Gwanda Town Centre & Joshua Nkomo Way",
        lat: -20.9362,
        lon: 29.007,
        elevationM: 26,
        category: "district",
        summary: "Mining and ranching capital on the Bulawayo–Beitbridge railway, founded in 1900 by gold prospectors.",
        vibeNote: "About 134 km south-east of Bulawayo; cattle ranching and gold mining country.",
        guideSlug: "visiting-zimbabwe",
      },
      {
        id: "gwa-mt-cazalet",
        name: "Jahunda Hill",
        lat: -20.9285,
        lon: 29.0165,
        elevationM: 56,
        category: "landmark",
        summary: "The nearby hill that Gwanda is named after (marker position approximate).",
        vibeNote: "Gwanda has a hot semi-arid climate at about 1,000 m elevation.",
        guideSlug: "visiting-zimbabwe",
      },
      {
        id: "gwa-phelandaba",
        name: "Gwanda Provincial Hospital",
        lat: -20.9415,
        lon: 28.9995,
        elevationM: 26,
        category: "landmark",
        summary: "Provincial hospital on 1st Avenue.",
        vibeNote: "Phelandaba Stadium is a separate site on Geniva Road, about 1.8 km to the east.",
        guideSlug: "healthcare-and-safety",
      },
    ],
  },
  {
    slug: "mashonaland-east",
    province: "Mashonaland East",
    capital: "Marondera",
    region: "Northern Highveld",
    lat: -18.1901,
    lon: 31.5455,
    populationLabel: "66,203 city · 1,731,173 province (2022 census)",
    airport: {
      code: null,
      name: "Small airfields only (Marondera, Mutoko, Kotwa)",
      status: "none",
      note: "No scheduled flights in the province; nearest is HRE (Harare). Marondera is about 72 km east of Harare.",
    },
    capitalElevationM: 1688,
    rentMonthlyRange: "$500 – $1,200 / mo (4 listings, Nov 2026)",
    salePriceRange: "$18,000 – $320,000 (14 listings, Nov 2026)",
    powerScore: "ZESA grid + solar · PV yield 1,818 kWh/kWp/yr",
    fiberStatus: "Starlink · no verified fibre coverage",
    tagline: "High-altitude pine & farming plateau 72 km east of Harare—cool climate, top schools, and Mutare highway.",
    transitLabel: "A3 Harare–Mutare Highway & Kombis",
    sources: [
      SRC_CENSUS,
      SRC_PROVINCES,
      SRC_AIRPORTS,
      wiki("Marondera", "Marondera"),
      solarSource(-18.1853, 31.5519),
      { label: "Marondera listings", url: "https://www.property.co.zw/houses-for-rent/marondera" },
      { label: "Propertybook Marondera rentals", url: "https://www.propertybook.co.zw/to-rent/marondera" },
      { label: "Property.co.zw Marondera houses for sale", url: "https://www.property.co.zw/houses-for-sale/marondera" },
      { label: "Propertybook Marondera houses for sale", url: "https://www.propertybook.co.zw/houses/for-sale/marondera" },
      { label: "Propertyzone Marondera for sale", url: "https://www.propzone.co.zw/en/for-sale/marondera/" },
    ],
    accentColor: "#4cb82a",
    waterType: "none",
    landmarks: [
      {
        id: "mar-cbd",
        name: "Marondera Pine Gardens & Main Street",
        lat: -18.1853,
        lon: 31.5519,
        elevationM: 28,
        category: "district",
        summary: "Elevated watershed town (1,688m) celebrated for horticultural farms and boarding schools.",
        vibeNote: "Less than an hour's drive east of Harare along the Mutare highway.",
        guideSlug: "moving-to-harare",
      },
      {
        id: "mar-civic",
        name: "Marondera Civic Centre & The Green",
        lat: -18.1815,
        lon: 31.5475,
        elevationM: 32,
        category: "landmark",
        summary: "Leafy town hall, library, and provincial government hub surrounded by pine groves.",
        vibeNote: "Cool crisp mornings year-round at 1,688m elevation.",
        guideSlug: "renting-an-apartment",
      },
      {
        id: "mar-rudhaka",
        name: "Rudhaka Stadium & Mutare Highway Hub",
        lat: -18.1875,
        lon: 31.5632,
        elevationM: 24,
        category: "transit",
        summary: "Regional sports venue and eastern coach stop on the A3 Harare–Mutare road.",
        vibeNote: "Links Mashonaland East's agricultural towns directly into Harare.",
        guideSlug: "getting-around-harare",
      },
    ],
  },
  {
    slug: "mashonaland-west",
    province: "Mashonaland West",
    capital: "Chinhoyi",
    region: "Zambezi & North",
    lat: -17.3615,
    lon: 30.1929,
    populationLabel: "103,671 city · 1,893,584 province (2022 census)",
    airport: {
      code: "KAB",
      name: "Kariba Airport",
      status: "unconfirmed",
      note: "The province's IATA airport, at Kariba; Fastjet began flights in 2023 but current service is unconfirmed. Chinhoyi has only a private airstrip; HRE (Harare) is about 116 km by road.",
    },
    capitalElevationM: 1187,
    rentMonthlyRange: "No current listing data",
    salePriceRange: "$13,000 – $150,000 (12 listings, Nov 2026)",
    powerScore: "ZESA grid + solar · PV yield 1,801 kWh/kWp/yr",
    fiberStatus: "Starlink · no verified fibre coverage",
    tagline: "Cobalt-blue Chinhoyi Caves, fertile maize belt, and the highway corridor north to Kariba Dam & Chirundu.",
    transitLabel: "A1 Harare–Chirundu Highway & Coaches",
    sources: [
      SRC_CENSUS,
      SRC_PROVINCES,
      wiki("Kariba Airport", "Kariba_Airport"),
      wiki("Chinhoyi", "Chinhoyi"),
      wiki("Chinhoyi Caves", "Chinhoyi_Caves"),
      solarSource(-17.3667, 30.2),
      { label: "Property.co.zw Chinhoyi houses for sale", url: "https://www.property.co.zw/houses-for-sale/chinhoyi" },
      { label: "Propertybook Chinhoyi houses for sale", url: "https://www.propertybook.co.zw/houses/for-sale/chinhoyi" },
    ],
    accentColor: "#38bdf8",
    waterType: "river",
    landmarks: [
      {
        id: "chn-cbd",
        name: "Chinhoyi Town Centre & Magamba Way",
        lat: -17.3667,
        lon: 30.2,
        elevationM: 28,
        category: "district",
        summary: "University and agricultural capital about 116 km northwest of Harare.",
        vibeNote: "About 9 km by road south-east of the Chinhoyi Caves and their cobalt-blue pool.",
        guideSlug: "visiting-zimbabwe",
      },
      {
        id: "chn-hospital",
        name: "Chinhoyi Provincial Hospital",
        lat: -17.3605,
        lon: 30.2085,
        elevationM: 30,
        category: "landmark",
        summary: "Mashonaland West's provincial hospital on Shandore Road.",
        vibeNote: "On the eastern side of town near the Manyame bridge and Chinhoyi University of Technology.",
        guideSlug: "healthcare-and-safety",
      },
      {
        id: "chn-stadium",
        name: "Chinhoyi Stadium",
        lat: -17.3755,
        lon: 30.1969,
        elevationM: 24,
        category: "culture",
        summary: "Town stadium on Robert Mugabe Road in Gadzema.",
        vibeNote: "Chinhoyi sits on the western bank of the Manyame River (formerly the Hunyani).",
        guideSlug: "getting-around-harare",
      },
    ],
  },
  {
    slug: "mashonaland-central",
    province: "Mashonaland Central",
    capital: "Bindura",
    region: "Northern Highveld",
    lat: -17.3019,
    lon: 31.3306,
    populationLabel: "51,393 town · 1,384,891 province (2022 census)",
    airport: {
      code: null,
      name: "Small airfields only (Centenary, Mount Darwin)",
      status: "none",
      note: "No scheduled flights in the province; nearest is HRE (Harare). Bindura is about 88 km north-east of Harare.",
    },
    capitalElevationM: 1070,
    rentMonthlyRange: "No current listing data",
    salePriceRange: "$35,000 – $165,000 (5 listings, Nov 2026)",
    powerScore: "ZESA grid + solar · PV yield 1,809 kWh/kWp/yr",
    fiberStatus: "Starlink · no verified fibre coverage",
    tagline: "Lush Mazowe Valley citrus, gold, and science-education town 88 km northeast of Harare.",
    transitLabel: "Mazowe–Bindura Highway & Coaches",
    sources: [
      SRC_CENSUS,
      SRC_PROVINCES,
      SRC_AIRPORTS,
      wiki("Bindura", "Bindura"),
      solarSource(-17.3019, 31.3306),
      { label: "Property.co.zw Bindura houses for sale", url: "https://www.property.co.zw/houses-for-sale/bindura" },
      { label: "Propertybook Bindura property for sale", url: "https://www.propertybook.co.zw/for-sale/bindura" },
    ],
    accentColor: "#de2010",
    waterType: "river",
    landmarks: [
      {
        id: "bnd-cbd",
        name: "Bindura Civic Centre & Robert Mugabe St",
        lat: -17.3019,
        lon: 31.3306,
        elevationM: 26,
        category: "district",
        summary: "Nickel/gold mining and farming hub anchored by Bindura University (BUSE).",
        vibeNote: "Scenic drive past Mazowe Dam and citrus orchards from northern Harare.",
        guideSlug: "moving-to-harare",
      },
      {
        id: "bnd-kimberley",
        name: "Kimberley Reef & Bindura Town House",
        lat: -17.2985,
        lon: 31.3245,
        elevationM: 30,
        category: "landmark",
        summary: "Historic mining town core, banks, and hospitality cluster north of the rail line.",
        vibeNote: "Serves Mashonaland Central's commercial farms and gold producers.",
        guideSlug: "starting-a-business",
      },
      {
        id: "bnd-chipadze",
        name: "Chipadze Stadium & Mazowe Valley Road",
        lat: -17.3165,
        lon: 31.3409,
        elevationM: 24,
        category: "culture",
        summary: "Southern sports and residential district linking town to BUSE hillside campus.",
        vibeNote: "Direct access along the Harare–Bindura–Mount Darwin highway.",
        guideSlug: "getting-around-harare",
      },
    ],
  },
];

export function getProvinceBySlug(slug: string): ZimbabweProvinceProfile | undefined {
  return ZIMBABWE_PROVINCES.find((p) => p.slug === slug);
}

/** Route of a province's 3D city map. */
export function cityMapHref(slug: string): string {
  return slug === "harare" ? "/harare" : `/explore/${slug}`;
}
