// api/scripts/generate-mock-data.ts
import { getDb } from "../queries/connection";
import { businesses } from "../../db/schema";
import { log } from "../lib/logger";

const AREAS = ["Nairobi CBD", "Westlands", "Kilimani", "Karen", "Nakuru CBD"] as const;
const CATEGORIES = ["dentist", "plumber", "lawyer", "real_estate", "restaurant", "salon"] as const;

const PREFIXES = ["Prime", "Elite", "Nairobi", "Kenya", "Apex", "Trusted", "Smart", "Local", "City", "Metro"];
const SUFFIXES = {
  dentist: ["Dental Clinic", "Smiles", "Dental Care", "Orthodontics"],
  plumber: ["Plumbing", "Plumbers", "Pipe Works", "Drainage"],
  lawyer: ["Law Firm", "Legal Associates", "Advocates", "Chambers"],
  real_estate: ["Properties", "Realty", "Estates", "Homes"],
  restaurant: ["Restaurant", "Cafe", "Kitchen", "Bistro"],
  salon: ["Salon", "Spa", "Beauty Bar", "Studios"],
} as const;

function getRandom(min: number, max: number) { return Math.random() * (max - min) + min; }
function getRandomInt(min: number, max: number) { return Math.floor(getRandom(min, max)); }
function pick<T>(arr: readonly T[]): T { return arr[getRandomInt(0, arr.length)]; }

type Category = typeof CATEGORIES[number];
type InsertBusiness = typeof businesses.$inferInsert;

async function generateData() {
  const db = getDb();
  log.info("Generating 150 mock businesses...");

  // Properly type the records array to match the DB schema
  const records: InsertBusiness[] = [];

  for (let i = 0; i < 150; i++) {
    const area = pick(AREAS);
    // Cast the category so TS knows it's exactly one of the allowed strings
    const category = pick(CATEGORIES) as Category;
    
    // Create a realistic name
    const name = `${pick(PREFIXES)} ${pick(SUFFIXES[category])}`;
    
    // Generate coordinates roughly around Nairobi
    const lat = -1.28 + (Math.random() - 0.5) * 0.1;
    const lng = 36.81 + (Math.random() - 0.5) * 0.1;

    // Randomize the "Bad" and "Good" signals for the GridScout scoring engine
    const hasWebsite = Math.random() > 0.4; // 60% have websites
    const reviewCount = getRandomInt(2, 200);
    const rating = getRandom(2.5, 5.0);

    records.push({
      name,
      category,
      area,
      lat,
      lng,
      phone: `07${getRandomInt(10, 99)}${getRandomInt(100000, 999999)}`,
      website: hasWebsite ? `https://${name.toLowerCase().replace(/\s/g, "")}.co.ke` : null,
      claimed: Math.random() > 0.5,
      rating: Number(rating.toFixed(1)),
      reviewCount,
      photos: hasWebsite ? getRandomInt(0, 20) : 0,
      posts: hasWebsite ? getRandomInt(0, 10) : 0,
      respondsToReviews: Math.random() > 0.7,
      keywordRank: hasWebsite ? getRandomInt(1, 50) : null,
      siteSpeed: hasWebsite ? getRandomInt(30, 95) : null,
      mobileOk: hasWebsite ? Math.random() > 0.2 : null,
      metaOk: hasWebsite ? Math.random() > 0.3 : null,
      estSearches: getRandomInt(100, 2000),
      avgTicketKes: getRandomInt(1000, 15000),
    });
  }

  // Insert in batches to avoid MySQL packet limits
  for (let i = 0; i < records.length; i += 50) {
    await db.insert(businesses).values(records.slice(i, i + 50));
  }

  log.info(`Successfully inserted ${records.length} businesses!`);
  process.exit(0);
}

generateData().catch((e) => {
  log.error("Failed to generate data", { error: e });
  process.exit(1);
});