// db/seed.ts
// GridScout synthetic demo-data generator.
// Safe by default: refuses to insert if the businesses table is not empty.
// Never deletes or resets existing data.

import { getDb } from "../api/queries/connection";
import { businesses } from "./schema";
import {
  AREA_LIST,
  AREA_META,
  CATEGORY_LIST,
  CATEGORY_META,
  type CategoryName,
} from "../contracts/grid";

// -------------------- Configuration --------------------

const DEFAULT_COUNT = 4000;
const DEFAULT_SEED = 42;
const BATCH_SIZE = 500;

// Usage:
// npx tsx db/seed.ts
// npx tsx db/seed.ts --count=2000 --seed=42

function readIntegerOption(
  option: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const argument = process.argv.find((value) =>
    value.startsWith(`${option}=`),
  );

  if (!argument) return fallback;

  const value = Number(argument.slice(option.length + 1));

  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${option} must be an integer between ${min} and ${max}.`);
  }

  return value;
}

// -------------------- Deterministic random generator --------------------

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    let t = (state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, values: readonly T[]): T {
  return values[Math.floor(rng() * values.length)];
}

function between(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function rollTier(rng: () => number): "invisible" | "weak" | "strong" {
  const value = rng();
  return value < 0.35 ? "invisible" : value < 0.75 ? "weak" : "strong";
}

// -------------------- Synthetic business names --------------------

const SUFFIXES: Record<CategoryName, readonly string[]> = {
  dentist: ["Dental Clinic", "Smiles", "Dental Care", "Orthodontics"],
  plumber: ["Plumbing", "Plumbers", "Pipe Works", "Drainage Solutions"],
  lawyer: ["Law Firm", "Legal Associates", "Advocates", "Chambers"],
  real_estate: ["Properties", "Realty", "Estates", "Homes"],
  restaurant: ["Restaurant", "Cafe", "Kitchen", "Bistro", "Grill"],
  salon: ["Salon", "Spa", "Beauty Bar", "Studios"],
  barbershop: ["Barbershop", "Cuts", "Barbers", "Grooming Lounge"],
  gym: ["Fitness", "Gym", "Health Club", "CrossFit"],
  pharmacy: ["Pharmacy", "Chemist", "Pharmaceuticals", "Drugstore"],
  clinic: ["Medical Centre", "Clinic", "Family Health", "Hospital"],
  optician: ["Opticians", "Eye Care", "Vision Centre", "Optical"],
  veterinary: ["Vet Clinic", "Animal Care", "Pet Hospital", "Veterinary"],
  physiotherapy: ["Physio", "Physiotherapy Centre", "Rehab", "Sports Clinic"],
  hotel: ["Hotel", "Suites", "Lodge", "Guest House", "Apartments"],
  garage: ["Motors", "Auto Garage", "Auto Care", "Car Clinic"],
  car_wash: ["Car Wash", "Auto Spa", "Detailing", "Wash Bay"],
  car_dealer: ["Motors", "Car Dealers", "Auto Mart", "Car Bazaar"],
  electrician: ["Electricals", "Electrical Services", "Power Works", "Wiring"],
  cleaning: ["Cleaning Services", "Cleaners", "Facility Care", "Fumigation"],
  security: ["Security", "Guards", "Security Solutions", "Alarm Systems"],
  accountant: ["Accountants", "Audit & Tax", "CPA", "Tax Advisors"],
  insurance: ["Insurance Agency", "Assurance", "Insurance Brokers", "Cover"],
  school: ["Academy", "Preparatory School", "International School", "College"],
  daycare: ["Daycare", "Kindergarten", "Little Learners", "Nursery"],
  driving_school: ["Driving School", "Driving Academy", "Motor School"],
  travel_agency: ["Travel", "Safaris", "Tours & Travel", "Holidays"],
  photographer: ["Photography", "Studios", "Visuals", "Films"],
  event_planner: ["Events", "Event Planners", "Celebrations", "Weddings"],
  caterer: ["Catering", "Caterers", "Foods", "Kitchen Services"],
  florist: ["Florist", "Flowers", "Blooms", "Bouquets"],
  bakery: ["Bakery", "Cakes", "Bakers", "Patisserie"],
  butchery: ["Butchery", "Meats", "Choma Hub", "Meat Market"],
  hardware: ["Hardware", "Building Supplies", "Tools & Hardware", "Paints"],
  furniture: ["Furniture", "Interiors", "Furnishers", "Woodworks"],
  interior_design: ["Interior Design", "Interiors", "Design Studio", "Decor"],
  architect: ["Architects", "Architecture", "Design Partners", "Planners"],
  construction: ["Construction", "Builders", "Contractors", "Engineering"],
  printing: ["Printers", "Printing Press", "Signage", "Print Shop"],
  it_services: ["Tech Solutions", "IT Services", "Computers", "Networks"],
  courier: ["Couriers", "Express", "Delivery", "Logistics"],
  moving: ["Movers", "Relocation", "Moving Services", "Transporters"],
  laundry: ["Laundry", "Dry Cleaners", "Laundromat", "Wash & Fold"],
  tailor: ["Tailors", "Fashion House", "Designers", "Alterations"],
  coworking: ["Cowork", "Workspace", "Hub", "Business Centre"],
  pest_control: ["Pest Control", "Fumigators", "Pest Solutions", "Exterminators"],
  solar: ["Solar", "Energy Solutions", "Solar Systems", "Power"],
  towing: ["Towing", "Recovery", "Roadside Assist", "Breakdown Services"],
};

const PREFIXES = [
  "Prime", "Elite", "Nairobi", "Kenya", "Apex", "Trusted", "Smart",
  "Local", "City", "Metro", "Savanna", "Jambo", "Umoja", "Pinnacle",
  "Summit", "Royal", "Crown", "Heritage", "Zuri", "Baraka",
  "Kilele", "Safari", "Rift", "Equator", "Mount Kenya", "Tembo",
  "Simba", "Imara", "Msingi", "Bora",
];

const SURNAMES = [
  "Wanjiru", "Otieno", "Kamau", "Mwangi", "Njoroge", "Odhiambo",
  "Kiprop", "Mutua", "Achieng", "Karanja", "Wafula", "Omondi",
  "Kimani", "Chebet", "Mbugua", "Naliaka", "Muthoni", "Kariuki",
  "Barasa", "Nyambura",
];

// -------------------- Geographic distribution --------------------

// Weight area allocation by the density values in the canonical contract.
// This gives larger commercial areas more records without ignoring smaller ones.
const AREA_SCHEDULE = AREA_LIST.flatMap((area) =>
  Array.from(
    { length: Math.max(1, Math.round(AREA_META[area].density)) },
    () => area,
  ),
);

// Generate a point uniformly inside a circular area.
// Longitude scaling accounts for latitude.
function generateCoordinates(
  rng: () => number,
  center: { lat: number; lng: number },
  radiusKm: number,
) {
  const angle = rng() * Math.PI * 2;
  const distance = Math.sqrt(rng()) * radiusKm;
  const latitudeRadians = (center.lat * Math.PI) / 180;
  const kmPerDegree = 111.32;

  const latOffset = (Math.cos(angle) * distance) / kmPerDegree;
  const lngOffset =
    (Math.sin(angle) * distance) /
    (kmPerDegree * Math.cos(latitudeRadians));

  return {
    lat: Number((center.lat + latOffset).toFixed(6)),
    lng: Number((center.lng + lngOffset).toFixed(6)),
  };
}

// -------------------- Record generation --------------------

function generateBusiness(
  index: number,
  seed: number,
  usedNames: Set<string>,
): typeof businesses.$inferInsert {
  // Each record has its own deterministic random stream.
  const rng = mulberry32(
    (seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0,
  );

  const category = CATEGORY_LIST[index % CATEGORY_LIST.length];
  const area = AREA_SCHEDULE[index % AREA_SCHEDULE.length];

  const areaMeta = AREA_META[area];
  const categoryMeta = CATEGORY_META[category];

  const suffix = pick(rng, SUFFIXES[category]);
  const nameStyle = rng();

  const baseName =
    nameStyle < 0.45
      ? `${pick(rng, PREFIXES)} ${suffix}`
      : nameStyle < 0.8
        ? `${pick(rng, SURNAMES)} ${suffix}`
        : `${pick(rng, PREFIXES)} ${pick(rng, SURNAMES)} ${suffix}`;

  // Explicit DEMO label prevents synthetic names being mistaken for real prospects.
  const base = `DEMO ${baseName}`;
  let name = base;

  for (let suffixNumber = 2; usedNames.has(name); suffixNumber++) {
    name = `${base} ${suffixNumber}`;
  }

  usedNames.add(name);

  const tier = rollTier(rng);

  const hasWebsite =
    tier === "strong"
      ? rng() < 0.95
      : tier === "weak"
        ? rng() < 0.55
        : rng() < 0.15;

  const coordinates = generateCoordinates(
    rng,
    areaMeta.center,
    areaMeta.radiusKm,
  );

  const rating =
    tier === "strong"
      ? between(rng, 4.2, 5.0)
      : tier === "weak"
        ? between(rng, 3.4, 4.6)
        : between(rng, 2.8, 4.3);

  const reviewCount =
    tier === "strong"
      ? 80 + Math.floor(rng() * 370)
      : tier === "weak"
        ? 15 + Math.floor(rng() * 75)
        : 1 + Math.floor(rng() * 24);

  const monthlySearches = between(
    rng,
    categoryMeta.monthlySearches[0],
    categoryMeta.monthlySearches[1],
  );

  const averageTicket = between(
    rng,
    categoryMeta.ticketKes[0],
    categoryMeta.ticketKes[1],
  );

  return {
    name,
    category,
    area,
    lat: coordinates.lat,
    lng: coordinates.lng,

    // Deliberately invalid placeholder; never a real person's phone number.
    phone: "0000000000",

    // .example is a reserved domain suffix, not a real business website.
    website: hasWebsite
      ? `https://demo-business-${String(index + 1).padStart(5, "0")}.example`
      : null,

    claimed:
      tier === "strong"
        ? rng() < 0.97
        : tier === "weak"
          ? rng() < 0.6
          : rng() < 0.2,

    rating: Number(rating.toFixed(1)),
    reviewCount,

    // Google Business Profile signals are independent of website ownership.
    photos:
      tier === "strong"
        ? Math.floor(rng() * 90)
        : tier === "weak"
          ? Math.floor(rng() * 25)
          : Math.floor(rng() * 8),

    posts:
      tier === "strong"
        ? Math.floor(rng() * 14)
        : tier === "weak"
          ? Math.floor(rng() * 4)
          : Math.floor(rng() * 2),

    respondsToReviews:
      tier === "strong"
        ? rng() < 0.8
        : tier === "weak"
          ? rng() < 0.3
          : rng() < 0.05,

    keywordRank: hasWebsite
      ? tier === "strong"
        ? 1 + Math.floor(rng() * 9)
        : tier === "weak"
          ? 8 + Math.floor(rng() * 22)
          : 25 + Math.floor(rng() * 35)
      : null,

    siteSpeed: hasWebsite
      ? Number(
          (
            tier === "strong"
              ? between(rng, 75, 98)
              : tier === "weak"
                ? between(rng, 45, 75)
                : between(rng, 25, 55)
          ).toFixed(1),
        )
      : null,

    mobileOk: hasWebsite
      ? rng() <
        (tier === "strong" ? 0.97 : tier === "weak" ? 0.75 : 0.4)
      : null,

    metaOk: hasWebsite
      ? rng() <
        (tier === "strong" ? 0.95 : tier === "weak" ? 0.6 : 0.25)
      : null,

    estSearches: Math.round(monthlySearches * areaMeta.demand),
    avgTicketKes: Math.round(averageTicket / 100) * 100,
  };
}

// -------------------- Database seeding --------------------

async function seed() {
  if (process.argv.includes("--reset")) {
    throw new Error(
      "--reset is intentionally unsupported. Existing business data is never deleted by this script.",
    );
  }

  const count = readIntegerOption("--count", DEFAULT_COUNT, 1, 100000);
  const seedValue = readIntegerOption("--seed", DEFAULT_SEED, 0, 4294967295);

  const db = getDb();

  console.log("GridScout demo-data generator");
  console.log(`Requested records: ${count}`);
  console.log(`Random seed: ${seedValue}`);
  console.log(`Areas: ${AREA_LIST.length}`);
  console.log(`Categories: ${CATEGORY_LIST.length}`);

  // Safety check: never append duplicate demo records or touch existing records.
  const existing = await db
    .select({ id: businesses.id })
    .from(businesses)
    .limit(1);

  if (existing.length > 0) {
    console.log(
      "Businesses table is not empty. No records inserted. Existing data preserved.",
    );
    process.exit(0);
  }

  const usedNames = new Set<string>();
  const rows: (typeof businesses.$inferInsert)[] = [];

  for (let index = 0; index < count; index++) {
    rows.push(generateBusiness(index, seedValue, usedNames));
  }

  console.log(`Generated ${rows.length} synthetic records in memory.`);

  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);

    await db.insert(businesses).values(batch);

    console.log(
      `Inserted ${Math.min(offset + batch.length, rows.length)} / ${rows.length}`,
    );
  }

  console.log("");
  console.log("Demo dataset successfully seeded.");
  console.log("All generated businesses are labelled DEMO.");
  console.log("Phone numbers and website domains are non-operational placeholders.");
  console.log("No existing records were deleted or modified.");

  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
