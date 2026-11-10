// contracts/grid.ts
// GridScout shared contracts (frontend <-> backend)
// Pure data + types + tiny helpers. No runtime deps, safe to import anywhere.
// Requires TypeScript >= 4.9 (uses `satisfies`).

export type Range = readonly [min: number, max: number];

/* ────────────────────────────── REGIONS & AREAS ────────────────────────────── */

export const REGION_META = {
  nairobi: { label: "Nairobi" },
  metro:   { label: "Greater Nairobi" },
  rift:    { label: "Rift Valley" },
  coast:   { label: "Coast" },
  lake:    { label: "Lake Region" },
} as const satisfies Record<string, { label: string }>;
export type RegionName = keyof typeof REGION_META;

export interface AreaMeta {
  region: RegionName;
  center: { lat: number; lng: number };
  zoom: number;      // default map zoom when the sector is selected
  radiusKm: number; // rough footprint; the generator jitters pins within it
  density: number;  // relative share of businesses (generator weight)
  demand: number;   // search-volume multiplier vs. baseline
}

export const AREA_META = {
  "Nairobi CBD":   { region: "nairobi", center: { lat: -1.2864, lng: 36.8172 }, zoom: 15, radiusKm: 0.9, density: 10, demand: 1.4 },
  "Westlands":     { region: "nairobi", center: { lat: -1.2635, lng: 36.8023 }, zoom: 15, radiusKm: 1.1, density: 9,  demand: 1.4 },
  "Kilimani":      { region: "nairobi", center: { lat: -1.2900, lng: 36.7850 }, zoom: 15, radiusKm: 1.1, density: 8,  demand: 1.3 },
  "Karen":         { region: "nairobi", center: { lat: -1.3197, lng: 36.7073 }, zoom: 14, radiusKm: 2.2, density: 5,  demand: 1.1 },
  "Lavington":     { region: "nairobi", center: { lat: -1.2810, lng: 36.7680 }, zoom: 15, radiusKm: 1.1, density: 5,  demand: 1.2 },
  "Kileleshwa":    { region: "nairobi", center: { lat: -1.2760, lng: 36.7840 }, zoom: 15, radiusKm: 0.9, density: 5,  demand: 1.2 },
  "Upper Hill":    { region: "nairobi", center: { lat: -1.2980, lng: 36.8130 }, zoom: 15, radiusKm: 0.8, density: 5,  demand: 1.3 },
  "Parklands":     { region: "nairobi", center: { lat: -1.2620, lng: 36.8180 }, zoom: 15, radiusKm: 0.9, density: 5,  demand: 1.1 },
  "South C":       { region: "nairobi", center: { lat: -1.3170, lng: 36.8300 }, zoom: 15, radiusKm: 1.0, density: 4,  demand: 0.9 },
  "Langata":       { region: "nairobi", center: { lat: -1.3470, lng: 36.7440 }, zoom: 14, radiusKm: 1.7, density: 4,  demand: 0.9 },
  "Eastleigh":     { region: "nairobi", center: { lat: -1.2750, lng: 36.8480 }, zoom: 15, radiusKm: 0.9, density: 6,  demand: 1.0 },
  "Roysambu":      { region: "nairobi", center: { lat: -1.2190, lng: 36.8870 }, zoom: 14, radiusKm: 1.3, density: 4,  demand: 0.8 },
  "Ruaka":         { region: "metro",   center: { lat: -1.2060, lng: 36.7830 }, zoom: 15, radiusKm: 1.1, density: 4,  demand: 0.8 },
  "Thika Town":    { region: "metro",   center: { lat: -1.0332, lng: 37.0693 }, zoom: 14, radiusKm: 1.3, density: 3,  demand: 0.6 },
  "Nakuru CBD":    { region: "rift",    center: { lat: -0.2833, lng: 36.0667 }, zoom: 15, radiusKm: 1.1, density: 4,  demand: 0.6 },
  "Eldoret CBD":   { region: "rift",    center: { lat:  0.5143, lng: 35.2698 }, zoom: 15, radiusKm: 1.1, density: 3,  demand: 0.5 },
  "Mombasa Nyali": { region: "coast",   center: { lat: -4.0200, lng: 39.7140 }, zoom: 14, radiusKm: 1.3, density: 4,  demand: 0.7 },
  "Kisumu CBD":    { region: "lake",    center: { lat: -0.1022, lng: 34.7617 }, zoom: 15, radiusKm: 1.1, density: 3,  demand: 0.5 },
} as const satisfies Record<string, AreaMeta>;

export type AreaName = keyof typeof AREA_META;
export const AREA_LIST = Object.keys(AREA_META) as [AreaName, ...AreaName[]];

export const AREAS_BY_REGION = (Object.keys(REGION_META) as RegionName[]).map((region) => ({
  region,
  label: REGION_META[region].label,
  areas: AREA_LIST.filter((a) => AREA_META[a].region === region),
}));

export const DEFAULT_AREA: AreaName = "Westlands";
export const DEFAULT_CENTER = AREA_META[DEFAULT_AREA].center;

/* ───────────────────────────── CATEGORIES & GROUPS ───────────────────────────── */

export const CATEGORY_GROUP_META = {
  health:       { label: "Health & medical" },
  beauty:       { label: "Beauty, fitness & personal care" },
  home:         { label: "Home services" },
  auto:         { label: "Automotive" },
  food:         { label: "Food & drink" },
  hospitality:  { label: "Hospitality & travel" },
  professional: { label: "Professional services" },
  property:     { label: "Property & construction" },
  education:    { label: "Education & childcare" },
  events:       { label: "Events, media & print" },
  logistics:    { label: "Logistics" },
} as const satisfies Record<string, { label: string }>;
export type CategoryGroup = keyof typeof CATEGORY_GROUP_META;

export interface CategoryMeta {
  label: string;            // plural, shown in UI
  keyword: string;          // the Google query we benchmark ranking against
  group: CategoryGroup;
  ticketKes: Range;         // typical revenue per customer / job
  monthlySearches: Range;   // typical local searches per month, baseline area
}

export const CATEGORY_META = {
  // health
  dentist:         { label: "Dentists",               keyword: "dentist near me",           group: "health",       ticketKes: [2000, 25000],     monthlySearches: [400, 2500] },
  clinic:          { label: "Medical Clinics",        keyword: "clinic near me",            group: "health",       ticketKes: [1500, 8000],      monthlySearches: [600, 3000] },
  pharmacy:        { label: "Pharmacies",             keyword: "pharmacy open now",         group: "health",       ticketKes: [500, 3000],       monthlySearches: [500, 2500] },
  optician:        { label: "Opticians",              keyword: "eye test near me",          group: "health",       ticketKes: [3000, 20000],     monthlySearches: [200, 1000] },
  veterinary:      { label: "Veterinary",             keyword: "vet near me",               group: "health",       ticketKes: [1500, 10000],     monthlySearches: [200, 1000] },
  physiotherapy:   { label: "Physiotherapy",          keyword: "physiotherapist near me",   group: "health",       ticketKes: [2500, 8000],      monthlySearches: [150, 800] },
  // beauty & personal care
  salon:           { label: "Salons",                 keyword: "salon near me",             group: "beauty",       ticketKes: [1000, 6000],      monthlySearches: [600, 3000] },
  barbershop:      { label: "Barbershops",            keyword: "barbershop near me",        group: "beauty",       ticketKes: [300, 1500],       monthlySearches: [400, 2000] },
  gym:             { label: "Gyms",                   keyword: "gym near me",               group: "beauty",       ticketKes: [3000, 9000],      monthlySearches: [300, 1800] },
  laundry:         { label: "Laundry & Dry Cleaners", keyword: "dry cleaner near me",       group: "beauty",       ticketKes: [500, 3000],       monthlySearches: [200, 1000] },
  tailor:          { label: "Tailors",                keyword: "tailor near me",            group: "beauty",       ticketKes: [1500, 12000],     monthlySearches: [150, 800] },
  // home services
  plumber:         { label: "Plumbers",               keyword: "emergency plumber",         group: "home",         ticketKes: [1500, 12000],     monthlySearches: [300, 1800] },
  electrician:     { label: "Electricians",           keyword: "electrician near me",       group: "home",         ticketKes: [1500, 15000],     monthlySearches: [250, 1500] },
  cleaning:        { label: "Cleaning Services",      keyword: "cleaning services",         group: "home",         ticketKes: [3000, 20000],     monthlySearches: [200, 1200] },
  pest_control:    { label: "Pest Control",           keyword: "pest control",              group: "home",         ticketKes: [3000, 15000],     monthlySearches: [100, 600] },
  solar:           { label: "Solar Installers",       keyword: "solar installation",        group: "home",         ticketKes: [80000, 800000],   monthlySearches: [150, 900] },
  // automotive
  garage:          { label: "Garages",                keyword: "car garage near me",        group: "auto",         ticketKes: [3000, 40000],     monthlySearches: [500, 2500] },
  car_wash:        { label: "Car Washes",             keyword: "car wash near me",          group: "auto",         ticketKes: [500, 2500],       monthlySearches: [300, 1500] },
  car_dealer:      { label: "Car Dealers",            keyword: "cars for sale",             group: "auto",         ticketKes: [600000, 3500000], monthlySearches: [200, 1200] },
  towing:          { label: "Towing",                 keyword: "towing service",            group: "auto",         ticketKes: [3000, 15000],     monthlySearches: [100, 500] },
  // food
  restaurant:      { label: "Restaurants",            keyword: "best restaurants near me",  group: "food",         ticketKes: [800, 4000],       monthlySearches: [800, 4000] },
  caterer:         { label: "Caterers",               keyword: "catering services",         group: "food",         ticketKes: [15000, 150000],   monthlySearches: [200, 1000] },
  bakery:          { label: "Bakeries",               keyword: "bakery near me",            group: "food",         ticketKes: [500, 5000],       monthlySearches: [300, 1500] },
  butchery:        { label: "Butcheries",             keyword: "butchery near me",          group: "food",         ticketKes: [800, 5000],       monthlySearches: [200, 900] },
  // hospitality
  hotel:           { label: "Hotels",                 keyword: "hotels near me",            group: "hospitality",  ticketKes: [6000, 35000],     monthlySearches: [800, 4000] },
  travel_agency:   { label: "Travel Agencies",        keyword: "travel agency near me",     group: "hospitality",  ticketKes: [15000, 200000],   monthlySearches: [300, 1800] },
  coworking:       { label: "Coworking Spaces",       keyword: "coworking space",           group: "hospitality",  ticketKes: [8000, 35000],     monthlySearches: [100, 500] },
  // professional
  lawyer:          { label: "Law Firms",              keyword: "law firm near me",          group: "professional", ticketKes: [5000, 80000],     monthlySearches: [200, 1200] },
  accountant:      { label: "Accountants",            keyword: "accountant near me",        group: "professional", ticketKes: [8000, 60000],     monthlySearches: [150, 800] },
  insurance:       { label: "Insurance Agents",       keyword: "insurance agent",           group: "professional", ticketKes: [10000, 80000],    monthlySearches: [150, 900] },
  architect:       { label: "Architects",             keyword: "architect near me",         group: "professional", ticketKes: [80000, 800000],   monthlySearches: [100, 600] },
  it_services:     { label: "IT Services",            keyword: "IT support",                group: "professional", ticketKes: [10000, 150000],   monthlySearches: [100, 700] },
  security:        { label: "Security Firms",         keyword: "security company",          group: "professional", ticketKes: [30000, 250000],   monthlySearches: [100, 600] },
  // property & construction
  real_estate:     { label: "Real Estate",            keyword: "houses for sale",           group: "property",     ticketKes: [30000, 400000],   monthlySearches: [300, 2000] },
  construction:    { label: "Construction",           keyword: "building contractor",       group: "property",     ticketKes: [200000, 3000000], monthlySearches: [150, 800] },
  interior_design: { label: "Interior Design",        keyword: "interior designer",         group: "property",     ticketKes: [50000, 600000],   monthlySearches: [150, 900] },
  hardware:        { label: "Hardware Stores",        keyword: "hardware store near me",    group: "property",     ticketKes: [1500, 25000],     monthlySearches: [200, 1000] },
  furniture:       { label: "Furniture",              keyword: "furniture shop",            group: "property",     ticketKes: [10000, 120000],   monthlySearches: [250, 1200] },
  // education
  school:          { label: "Private Schools",        keyword: "private schools near me",   group: "education",    ticketKes: [30000, 150000],   monthlySearches: [300, 1500] },
  daycare:         { label: "Daycares",               keyword: "daycare near me",           group: "education",    ticketKes: [8000, 35000],     monthlySearches: [200, 900] },
  driving_school:  { label: "Driving Schools",        keyword: "driving school",            group: "education",    ticketKes: [8000, 25000],     monthlySearches: [200, 1000] },
  // events, media & print
  event_planner:   { label: "Event Planners",         keyword: "event planner",             group: "events",       ticketKes: [40000, 400000],   monthlySearches: [150, 900] },
  photographer:    { label: "Photographers",          keyword: "wedding photographer",      group: "events",       ticketKes: [8000, 60000],     monthlySearches: [200, 1200] },
  florist:         { label: "Florists",               keyword: "flower delivery",           group: "events",       ticketKes: [1500, 10000],     monthlySearches: [150, 800] },
  printing:        { label: "Printers",               keyword: "printing services",         group: "events",       ticketKes: [1500, 30000],     monthlySearches: [250, 1400] },
  // logistics
  courier:         { label: "Couriers",               keyword: "courier services",          group: "logistics",    ticketKes: [500, 3000],       monthlySearches: [200, 1000] },
  moving:          { label: "Movers",                 keyword: "movers near me",            group: "logistics",    ticketKes: [8000, 45000],     monthlySearches: [200, 1000] },
} as const satisfies Record<string, CategoryMeta>;

export type CategoryName = keyof typeof CATEGORY_META;
// Tuple type, so it feeds z.enum(CATEGORY_LIST) with no cast
export const CATEGORY_LIST = Object.keys(CATEGORY_META) as [CategoryName, ...CategoryName[]];

const byLabel = (a: CategoryName, b: CategoryName) =>
  CATEGORY_META[a].label.localeCompare(CATEGORY_META[b].label);

// Ready for <optgroup> rendering, alphabetised inside each group
export const CATEGORIES_BY_GROUP = (Object.keys(CATEGORY_GROUP_META) as CategoryGroup[]).map((group) => ({
  group,
  label: CATEGORY_GROUP_META[group].label,
  categories: CATEGORY_LIST.filter((c) => CATEGORY_META[c].group === group).sort(byLabel),
}));

export const isCategory = (v: unknown): v is CategoryName =>
  typeof v === "string" && v in CATEGORY_META;
export const isArea = (v: unknown): v is AreaName =>
  typeof v === "string" && v in AREA_META;

/* ──────────────────────────────── SCORING BANDS ──────────────────────────────── */
// Single source of truth. Legend, counters, map pins and scoreColor() all read from here.

export const SCORE_BANDS = { invisibleBelow: 35, strongFrom: 65 } as const;

export type ScoreBand = "invisible" | "weak" | "strong";
export type Tone = "red" | "amber" | "mint" | "primary" | "neutral";

export const scoreBand = (score: number): ScoreBand =>
  score < SCORE_BANDS.invisibleBelow ? "invisible" : score >= SCORE_BANDS.strongFrom ? "strong" : "weak";

export const BAND_META: Record<ScoreBand, { label: string; range: string; tone: Tone }> = {
  invisible: { label: "Invisible", range: `<${SCORE_BANDS.invisibleBelow}`,                              tone: "red" },
  weak:      { label: "Weak",      range: `${SCORE_BANDS.invisibleBelow}–${SCORE_BANDS.strongFrom - 1}`, tone: "amber" },
  strong:    { label: "Strong",    range: `${SCORE_BANDS.strongFrom}+`,                                   tone: "mint" },
};

/* ──────────────────────────────────── LEADS ──────────────────────────────────── */

export const LEAD_STATUS_LIST = ["new", "contacted", "replied", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUS_LIST)[number];

export const LEAD_STATUS_META: Record<LeadStatus, { label: string; tone: Tone; next: readonly LeadStatus[] }> = {
  new:       { label: "New",       tone: "neutral", next: ["contacted", "lost"] },
  contacted: { label: "Contacted", tone: "primary", next: ["replied", "lost"] },
  replied:   { label: "Replied",   tone: "amber",   next: ["won", "lost"] },
  won:       { label: "Won",       tone: "mint",    next: [] },
  lost:      { label: "Lost",      tone: "red",     next: ["new"] }, // allow reopening
};
export const canTransition = (from: LeadStatus, to: LeadStatus) =>
  LEAD_STATUS_META[from].next.includes(to);

/* ─────────────────────────────────── CREDITS ─────────────────────────────────── */

export const CREDIT_PRICE_KES = 500; // 1 lead credit, per proposal
export const CREDIT_BUNDLES = [1, 5, 12] as const;
export type CreditBundle = (typeof CREDIT_BUNDLES)[number];
export const bundlePriceKes = (credits: number) => credits * CREDIT_PRICE_KES;

/* ──────────────────────────────────── FIX PLAN ───────────────────────────────── */
// What an agency can sell to fix the leaks we detect. Prices are PLACEHOLDERS (KES, one-off):
// tune them to what you actually charge. The homepage sample plan should match these.

export interface FixPackageMeta {
  label: string;
  blurb: string;
  priceKes: number;
  timeline: string;
}

export const FIX_PACKAGE_META = {
  claim_profile: {
    label: "Claim & optimise Google profile",
    blurb: "Verify ownership, fix category, hours, description and contact details.",
    priceKes: 8000,
    timeline: "2–3 days",
  },
  one_page_site: {
    label: "One-page mobile site",
    blurb: "Fast, mobile-first page with services, map, WhatsApp button and contact form.",
    priceKes: 25000,
    timeline: "5–7 days",
  },
  site_tune_up: {
    label: "Website tune-up",
    blurb: "Fix mobile layout, page titles and descriptions, and speed on the existing site.",
    priceKes: 12000,
    timeline: "3–5 days",
  },
  review_drive: {
    label: "30-day review drive",
    blurb: "QR code and WhatsApp request flow to collect fresh customer reviews.",
    priceKes: 6500,
    timeline: "30 days",
  },
  review_replies: {
    label: "Review reply setup",
    blurb: "Reply templates and a simple routine so every review gets an answer.",
    priceKes: 4000,
    timeline: "1–2 days",
  },
  profile_content: {
    label: "Photos & posts refresh",
    blurb: "Professional photo set plus a first month of profile posts.",
    priceKes: 5500,
    timeline: "1 week",
  },
} as const satisfies Record<string, FixPackageMeta>;

export type FixPackageId = keyof typeof FIX_PACKAGE_META;

// The audit signals the plan is derived from (a subset of AuditDetail)
export interface FixPlanInput {
  claimed: boolean;
  rating: number;
  reviewCount: number;
  respondsToReviews: boolean;
  photos: number;
  posts: number;
  website: string | null;
  mobileOk: boolean | null;
  metaOk: boolean | null;
  siteSpeed: number | null;
}

// Thresholds are starting points; adjust as you see real data
const FIX_THRESHOLDS = { minReviews: 30, minRating: 4.0, minPhotos: 5, minSiteSpeed: 50 } as const;

/** Ordered by expected impact. Empty array means the profile is healthy. */
export function buildFixPlan(a: FixPlanInput): FixPackageId[] {
  const plan: FixPackageId[] = [];
  if (!a.claimed) plan.push("claim_profile");
  if (a.website === null) {
    plan.push("one_page_site");
  } else if (
    a.mobileOk === false ||
    a.metaOk === false ||
    (a.siteSpeed !== null && a.siteSpeed < FIX_THRESHOLDS.minSiteSpeed)
  ) {
    plan.push("site_tune_up");
  }
  if (a.reviewCount < FIX_THRESHOLDS.minReviews || a.rating < FIX_THRESHOLDS.minRating) plan.push("review_drive");
  if (!a.respondsToReviews) plan.push("review_replies");
  if (a.photos < FIX_THRESHOLDS.minPhotos || a.posts === 0) plan.push("profile_content");
  return plan;
}

export const fixPlanTotalKes = (plan: readonly FixPackageId[]) =>
  plan.reduce((sum, id) => sum + FIX_PACKAGE_META[id].priceKes, 0);

/* ───────────────────────────────── SCAN CONTRACT ─────────────────────────────── */

export const SCAN_MAX_RESULTS = 300; // server caps scans; sorted by lostRevenueKes first

export interface ScanInput {
  area: AreaName;
  category?: CategoryName; // omitted = all categories
}

export interface AreaSummary {
  name: AreaName;
  region: RegionName;
  center: { lat: number; lng: number };
  zoom: number;
  businesses: number;
}

/* ────────────────────────────────── DTO SHAPES ───────────────────────────────── */

export interface ScoreBreakdown {
  maps: number;
  web: number;
  visibility: number;
}

export interface BusinessScanResult {
  id: number;
  name: string;
  category: CategoryName;
  area: string;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  website: string | null;
  scores: ScoreBreakdown;
  lostRevenueKes: number;
  estSearches: number;
  issues: string[];
}

export interface CompetitorInfo {
  id: number;
  name: string;
  visibilityScore: number;
  distanceKm: number;
  reviewCount: number;
  keywordRank: number | null;
}

export interface AuditDetail extends BusinessScanResult {
  phone: string;
  pitch: string | null;
  claimed: boolean;
  photos: number;
  posts: number;
  respondsToReviews: boolean;
  keywordRank: number | null;
  siteSpeed: number | null;
  mobileOk: boolean | null;
  metaOk: boolean | null;
  avgTicketKes: number;
  competitors: CompetitorInfo[];
  leadStatus: LeadStatus | null;
  leadId: number | null;
}

export interface LeadDto {
  id: number;
  status: LeadStatus;
  notes: string | null;
  pitch: string | null;
  createdAt: Date;
  business: BusinessScanResult & { phone: string };
}

export interface WalletDto {
  credits: number;
  unlimited: boolean; 
  transactions: {
    id: number;
    kind: "purchase" | "unlock" | "bonus";
    credits: number;
    amountKes: number;
    status: "pending" | "completed" | "failed";
    mpesaRef: string | null;
    createdAt: Date;
  }[];
}