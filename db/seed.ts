// db/seed.ts
import { getDb } from "../api/queries/connection";
import { businesses } from "./schema";
import {
  AREA_LIST,
  AREA_META,
  CATEGORY_LIST,
  CATEGORY_META,
  type AreaName,
  type CategoryName,
} from "../contracts/grid";

// Deterministic PRNG so the dataset is stable across re-seeds
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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

const PREFIXES = ["Prime", "Elite", "Nairobi", "Kenya", "Apex", "Trusted", "Smart", "Local", "City", "Metro",
  "Savanna", "Jambo", "Umoja", "Pinnacle", "Summit", "Royal", "Crown", "Heritage", "Zuri", "Baraka",
  "Kilele", "Safari", "Rift", "Equator", "Mount Kenya", "Tembo", "Simba", "Imara", "Msingi", "Bora"];
const SURNAMES = ["Wanjiru", "Otieno", "Kamau", "Mwangi", "Njoroge", "Odhiambo", "Kiprop", "Mutua", "Achieng",
  "Karanja", "Wafula", "Omondi", "Kimani", "Chebet", "Mbugua", "Naliaka", "Muthoni", "Kariuki", "Barasa", "Nyambura"];
const MOBILE_PREFIXES = ["700", "710", "720", "722", "733", "740", "745", "750", "790", "110", "112"] as const;

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function rollTier(rng: () => number) {
  const r = rng();
  return r < 0.35 ? "invisible" : r < 0.75 ? "weak" : "strong";
}

async function seed() {
  const db = getDb();
  console.log("Seeding GridScout database...");

  const existing = await db.select({ id: businesses.id }).from(businesses).limit(1);
  if (existing.length > 0) {
    console.log("Businesses already seeded — skipping. (Run with --reset to force).");
    process.exit(0);
  }

  const usedNames = new Set<string>();
  const rows: (typeof businesses.$inferInsert)[] = [];

  // Generate 4,000 businesses
  for (let i = 0; i < 4000; i++) {
    const category = CATEGORY_LIST[i % CATEGORY_LIST.length];
    const area = pick(Math.random, AREA_LIST);
    const a = AREA_META[area];
    const cat = CATEGORY_META[category];
    const rng = mulberry32(i + 42);

    // Name generation
    const suffix = pick(rng, SUFFIXES[category]);
    const r = rng();
    const base =
      r < 0.45 ? `${pick(rng, PREFIXES)} ${suffix}`
      : r < 0.8 ? `${pick(rng, SURNAMES)} ${suffix}`
      : `${pick(rng, PREFIXES)} ${pick(rng, SURNAMES)} ${suffix}`;

    let name = base;
    for (let k = 2; usedNames.has(name); k++) name = `${base} ${k}`;
    usedNames.add(name);

    const tier = rollTier(rng);
    const hasWebsite = tier === "strong" ? rng() < 0.95 : tier === "weak" ? rng() < 0.55 : rng() < 0.15;
    const spread = a.radiusKm / 111;

    // Generate values based on tier
    const rating = tier === "strong" ? 4.2 + rng() * 0.8 : tier === "weak" ? 3.4 + rng() * 1.2 : 2.8 + rng() * 1.5;
    const reviewCount = tier === "strong" ? 80 + Math.floor(rng() * 370) : tier === "weak" ? 15 + Math.floor(rng() * 75) : 1 + Math.floor(rng() * 24);

    rows.push({
      name,
      category,
      area,
      lat: Number((a.center.lat + (rng() - 0.5) * spread).toFixed(6)),
      lng: Number((a.center.lng + (rng() - 0.5) * spread).toFixed(6)),
      phone: `0${pick(rng, MOBILE_PREFIXES)}${Math.floor(rng() * 1000000).toString().padStart(6, "0")}`,
      website: hasWebsite ? `https://${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.co.ke` : null,
      claimed: tier === "strong" ? rng() < 0.97 : tier === "weak" ? rng() < 0.6 : rng() < 0.2,
      rating: Number(rating.toFixed(1)),
      reviewCount,
      photos: hasWebsite ? Math.floor(rng() * (tier === "strong" ? 90 : 25)) : 0,
      posts: hasWebsite ? Math.floor(rng() * (tier === "strong" ? 14 : 4)) : 0,
      respondsToReviews: tier === "strong" ? rng() < 0.8 : tier === "weak" ? rng() < 0.3 : rng() < 0.05,
      keywordRank: hasWebsite ? (tier === "strong" ? 1 + Math.floor(rng() * 9) : tier === "weak" ? 8 + Math.floor(rng() * 22) : 25 + Math.floor(rng() * 35)) : null,
      siteSpeed: hasWebsite ? Math.round((tier === "strong" ? 75 + rng() * 23 : tier === "weak" ? 45 + rng() * 30 : 25 + rng() * 30) * 10) / 10 : null,
      mobileOk: hasWebsite ? rng() < (tier === "strong" ? 0.97 : tier === "weak" ? 0.75 : 0.4) : null,
      metaOk: hasWebsite ? rng() < (tier === "strong" ? 0.95 : tier === "weak" ? 0.6 : 0.25) : null,
      estSearches: Math.round((cat.monthlySearches[0] + rng() * (cat.monthlySearches[1] - cat.monthlySearches[0])) * a.demand),
      avgTicketKes: Math.round((cat.ticketKes[0] + rng() * (cat.ticketKes[1] - cat.ticketKes[0])) / 100) * 100,
    });
  }

  // insert in batches
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    await db.insert(businesses).values(rows.slice(i, i + BATCH));
    console.log(`Inserted ${Math.min(i + BATCH, rows.length)} / ${rows.length}`);
  }
  
  console.log(`Seeded ${rows.length} businesses across ${AREA_LIST.length} areas.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});