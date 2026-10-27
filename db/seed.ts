import { getDb } from "../api/queries/connection";
import { businesses, AREAS, CATEGORIES } from "./schema";

// Deterministic PRNG so the dataset is stable across re-seeds
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const AREA_CENTERS: Record<string, { lat: number; lng: number }> = {
  "Nairobi CBD": { lat: -1.2864, lng: 36.8172 },
  Westlands: { lat: -1.2635, lng: 36.8023 },
  Kilimani: { lat: -1.292, lng: 36.787 },
  Karen: { lat: -1.3192, lng: 36.7058 },
  "Nakuru CBD": { lat: -0.3031, lng: 36.08 },
};

const NAMES: Record<(typeof CATEGORIES)[number], { a: string[]; b: string[] }> = {
  dentist: {
    a: ["SmilePoint", "Pearly Whites", "Afya Dental", "ToothCare", "Rafiki Dental", "Nuru Smiles", "CityDental", "Ivory Care", "BrightBite", "Huruma Dental", "Elm Park Dental", "Jasmine Smiles", "Kamau Dental", "Apex Ortho", "Tausi Dental", "Mwangaza Smiles"],
    b: ["Dental Clinic", "Dental Care", "Dentists", "Dental Studio", "Family Dentistry", "Orthodontic Centre"],
  },
  plumber: {
    a: ["FlowMasters", "QuickFix Plumbing", "MajiTech", "Neema Plumbers", "RapidFlow", "Simba Plumbing", "DrainPros", "HydroServe", "Taps & Sons", "Baraka Plumbing", "JetFlow", "Urban Pipes", "Kijana Plumbing", "AquaFix", "PressurePoint", "Dundori Plumbers"],
    b: ["Plumbing Services", "Plumbers", "Plumbing & Drainage", "Plumbing Co.", "Plumbing Solutions"],
  },
  lawyer: {
    a: ["Otieno & Associates", "Kerubo Advocates", "Stonebridge Law", "Mwangi & Partners", "Cedar Law", "Nairobi Legal Group", "Ashford Advocates", "Wanjiru Law", "Pinnacle Attorneys", "Baraka Legal", "Thika Road Advocates", "Summit Law", "Odhiambo & Co", "Meridian Attorneys", "TrustLaw", "Kimani Associates"],
    b: ["Advocates", "Attorneys at Law", "Law Firm", "Legal Consultants", "Advocates LLP"],
  },
  real_estate: {
    a: ["PrimeNest", "Keystone Properties", "Nyumba Prime", "Skyline Estates", "Terra Homes", "Rafiki Realtors", "Haven Realty", "Nairobi Property Hub", "GreenAcres", "Sahara Homes", "UrbanNest", "Zuri Properties", "CapitalLand", "Hillcrest Estates", "Nyota Realtors", "Baobab Homes"],
    b: ["Real Estate", "Properties", "Realty", "Property Advisors", "Estates"],
  },
  restaurant: {
    a: ["The Copper Pot", "Kilimanjaro Bites", "Nairobi Grill", "Mama Oliech's Kitchen", "The Fig Tree", "Charcoal & Smoke", "Java Corner", "Saffron House", "The Garden Terrace", "Wanjikos Kitchen", "Baobab Café", "The Roast Room", "Tamarind Street", "Jiko Fire", "Deli 27", "Palm Court"],
    b: ["Restaurant", "Kitchen", "Eatery", "Grill House", "Café & Grill"],
  },
  salon: {
    a: ["Glow Lounge", "Shear Genius", "Nairobi Hair Studio", "Tresses & Co", "The Beauty Bar", "Silk & Shine", "Urban Mane", "Adaeze Beauty", "Polish Point", "Braids & Beyond", "Crown & Glory", "Lush Studio", "Nails by Wambui", "The Look Lab", "Velvet Touch", "Kinks & Co"],
    b: ["Salon", "Hair & Beauty", "Beauty Lounge", "Salon & Spa", "Hair Studio"],
  },
};

const TICKETS_KES: Record<(typeof CATEGORIES)[number], number> = {
  dentist: 8000,
  plumber: 4500,
  lawyer: 25000,
  real_estate: 45000,
  restaurant: 1200,
  salon: 1500,
};

const BASE_SEARCHES: Record<(typeof CATEGORIES)[number], number> = {
  dentist: 1300,
  plumber: 2100,
  lawyer: 900,
  real_estate: 1600,
  restaurant: 5400,
  salon: 2900,
};

const DOMAIN_WORDS: Record<(typeof CATEGORIES)[number], string> = {
  dentist: "dental",
  plumber: "plumbing",
  lawyer: "law",
  real_estate: "properties",
  restaurant: "eatery",
  salon: "beauty",
};

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

async function seed() {
  const db = getDb();
  console.log("Seeding GridScout database...");

  const existing = await db.select({ id: businesses.id }).from(businesses).limit(1);
  if (existing.length > 0) {
    console.log("Businesses already seeded — skipping.");
    process.exit(0);
  }

  const rows: (typeof businesses.$inferInsert)[] = [];
  const usedNames = new Set<string>();

  AREAS.forEach((area, areaIdx) => {
    CATEGORIES.forEach((category, catIdx) => {
      const center = AREA_CENTERS[area];
      const rng = mulberry32(areaIdx * 1000 + catIdx * 137 + 42);
      const count = 4 + Math.floor(rng() * 2); // 4-5 per cell

      for (let i = 0; i < count; i++) {
        // name: ensure uniqueness by combining pools
        let name = "";
        for (let attempt = 0; attempt < 12; attempt++) {
          const candidate = `${pick(rng, NAMES[category].a)} ${pick(rng, NAMES[category].b)}`;
          if (!usedNames.has(candidate)) {
            name = candidate;
            usedNames.add(candidate);
            break;
          }
        }
        if (!name) continue;

        const lat = center.lat + (rng() - 0.5) * 0.018;
        const lng = center.lng + (rng() - 0.5) * 0.022;

        const claimed = rng() < 0.68;
        const rating = Math.round((2.8 + rng() * 2.2) * 10) / 10;
        const reviewCount = claimed ? Math.floor(rng() * 180) : Math.floor(rng() * 14);
        const hasWebsite = rng() < 0.55;
        const ranked = rng() < 0.42;
        const keywordRank = ranked ? 3 + Math.floor(rng() * 42) : null;
        const slug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "")
          .slice(0, 18);
        const siteSpeed = hasWebsite ? Math.round((35 + rng() * 60) * 10) / 10 : null;

        rows.push({
          name,
          category,
          area,
          lat: Math.round(lat * 1e6) / 1e6,
          lng: Math.round(lng * 1e6) / 1e6,
          phone: `+254 7${Math.floor(rng() * 9)}${String(Math.floor(rng() * 1e7)).padStart(7, "0")}`,
          website: hasWebsite ? `https://www.${slug}.co.ke` : null,
          claimed,
          rating,
          reviewCount,
          photos: claimed ? Math.floor(rng() * 40) : Math.floor(rng() * 5),
          posts: claimed ? Math.floor(rng() * 12) : 0,
          respondsToReviews: claimed && rng() < 0.5,
          keywordRank,
          siteSpeed,
          mobileOk: hasWebsite ? rng() < 0.62 : null,
          metaOk: hasWebsite ? rng() < 0.55 : null,
          estSearches: Math.floor(BASE_SEARCHES[category] * (0.6 + rng() * 0.9)),
          avgTicketKes: Math.floor(TICKETS_KES[category] * (0.7 + rng() * 0.8)),
        });
      }
    });
  });

  // insert in batches
  for (let i = 0; i < rows.length; i += 40) {
    await db.insert(businesses).values(rows.slice(i, i + 40));
  }
  console.log(`Seeded ${rows.length} businesses across ${AREAS.length} areas.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
