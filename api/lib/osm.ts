import { TRPCError } from "@trpc/server";
import {
  AREA_META,
  CATEGORY_META,
  type AreaName,
  type CategoryName,
} from "@contracts/grid";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const CACHE_TTL_MS = 5 * 60 * 1000;
const PROVIDER_COOLDOWN_MS = 10 * 1000;
const REQUEST_TIMEOUT_MS = 30 * 1000;
const MAX_CANDIDATES = 300;

type OsmTags = Record<string, string>;

interface OsmElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: OsmTags;
}

interface OverpassResponse {
  elements?: OsmElement[];
}

export interface OsmCandidate {
  externalId: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  category: CategoryName | "Unmapped";
  categoryStatus: "mapped" | "unmapped";
  sourceUrl: string;
}

export interface OsmPreview {
  area: AreaName;
  fetchedAt: string;
  totalReturned: number;
  included: number;
  needsReview: number;
  skipped: number;
  truncated: boolean;
  candidates: OsmCandidate[];
}

const cache = new Map<string, { expiresAt: number; data: OsmPreview }>();
const inFlight = new Map<string, Promise<OsmPreview>>();
let lastProviderRequestAt = 0;

const BUSINESS_TAG_KEYS = [
  "amenity",
  "shop",
  "office",
  "craft",
  "healthcare",
  "tourism",
  "leisure",
  "club",
  "landuse",
  "industrial",
  "man_made",
];

const IGNORED_AMENITIES = new Set([
  "bench",
  "bicycle_parking",
  "drinking_water",
  "fountain",
  "parking",
  "parking_space",
  "post_box",
  "recycling",
  "shelter",
  "toilets",
  "waste_basket",
]);

const CATEGORY_RULES: Array<{
  category: CategoryName;
  key: string;
  values: string[];
}> = [
  { category: "dentist", key: "amenity", values: ["dentist"] },
  { category: "clinic", key: "amenity", values: ["clinic", "doctors"] },
  { category: "pharmacy", key: "amenity", values: ["pharmacy"] },
  { category: "optician", key: "shop", values: ["optician"] },
  { category: "veterinary", key: "amenity", values: ["veterinary"] },
  { category: "physiotherapy", key: "healthcare", values: ["physiotherapist"] },
  { category: "salon", key: "shop", values: ["beauty", "hairdresser"] },
  { category: "barbershop", key: "shop", values: ["barber"] },
  { category: "gym", key: "leisure", values: ["fitness_centre", "sports_centre"] },
  { category: "laundry", key: "shop", values: ["laundry", "dry_cleaning"] },
  { category: "tailor", key: "shop", values: ["tailor"] },
  { category: "plumber", key: "craft", values: ["plumber"] },
  { category: "electrician", key: "craft", values: ["electrician"] },
  { category: "cleaning", key: "craft", values: ["cleaning"] },
  { category: "pest_control", key: "office", values: ["pest_control"] },
  { category: "solar", key: "craft", values: ["solar_installer"] },
  { category: "garage", key: "shop", values: ["car_repair", "tyres"] },
  { category: "car_wash", key: "amenity", values: ["car_wash"] },
  { category: "car_dealer", key: "shop", values: ["car", "motorcycle"] },
  { category: "towing", key: "amenity", values: ["vehicle_inspection"] },
  { category: "restaurant", key: "amenity", values: ["restaurant", "fast_food", "food_court"] },
  { category: "caterer", key: "craft", values: ["caterer"] },
  { category: "bakery", key: "shop", values: ["bakery"] },
  { category: "butchery", key: "shop", values: ["butcher"] },
  { category: "hotel", key: "tourism", values: ["hotel", "guest_house", "hostel", "motel"] },
  { category: "travel_agency", key: "shop", values: ["travel_agency"] },
  { category: "coworking", key: "office", values: ["coworking"] },
  { category: "lawyer", key: "office", values: ["lawyer"] },
  { category: "accountant", key: "office", values: ["accountant"] },
  { category: "insurance", key: "office", values: ["insurance"] },
  { category: "architect", key: "office", values: ["architect"] },
  { category: "it_services", key: "office", values: ["it"] },
  { category: "security", key: "office", values: ["security"] },
  { category: "real_estate", key: "office", values: ["estate_agent"] },
  { category: "construction", key: "craft", values: ["builder", "carpenter", "roofer"] },
  { category: "interior_design", key: "craft", values: ["interior_decorator"] },
  { category: "hardware", key: "shop", values: ["hardware", "trade"] },
  { category: "furniture", key: "shop", values: ["furniture"] },
  { category: "school", key: "amenity", values: ["school"] },
  { category: "daycare", key: "amenity", values: ["kindergarten", "childcare"] },
  { category: "driving_school", key: "amenity", values: ["driving_school"] },
  { category: "event_planner", key: "office", values: ["event_management"] },
  { category: "photographer", key: "craft", values: ["photographer"] },
  { category: "florist", key: "shop", values: ["florist"] },
  { category: "printing", key: "shop", values: ["copyshop", "printing"] },
  { category: "courier", key: "amenity", values: ["parcel_locker", "post_office"] },
  { category: "moving", key: "office", values: ["moving_company"] },
];

const validCategories = new Set<string>(Object.keys(CATEGORY_META));

function mapCategory(tags: OsmTags): CategoryName | null {
  // More specific categories should win over broader matches.
  const ordered = [...CATEGORY_RULES].sort((a, b) => {
    const priority = (category: CategoryName) =>
      category === "barbershop" ? 0 : category === "salon" ? 1 : 2;
    return priority(a.category) - priority(b.category);
  });

  for (const rule of ordered) {
    if (rule.values.includes(tags[rule.key] ?? "")) {
      return validCategories.has(rule.category) ? rule.category : null;
    }
  }

  // Additional useful mappings for common OSM tagging patterns.
  if (tags.healthcare === "dentist") return "dentist";
  if (tags.healthcare === "clinic") return "clinic";
  if (tags.healthcare === "pharmacy") return "pharmacy";
  if (tags.shop === "car_repair") return "garage";
  if (tags.amenity === "cafe") return "restaurant";

  return null;
}

function isBusinessCandidate(tags: OsmTags): boolean {
  if (!tags.name?.trim()) return false;

  if (
    tags.amenity &&
    IGNORED_AMENITIES.has(tags.amenity)
  ) {
    return false;
  }

  return BUSINESS_TAG_KEYS.some((key) => {
    const value = tags[key];
    return Boolean(value && value.trim());
  });
}

function buildAddress(tags: OsmTags): string | null {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"],
    tags["addr:city"],
    tags["addr:postcode"],
  ].filter((part): part is string => Boolean(part?.trim()));

  return parts.length ? parts.join(", ") : null;
}

function normalizeElement(element: OsmElement): OsmCandidate | null {
  const tags = element.tags ?? {};
  const name = tags.name?.trim();

  if (!name || !isBusinessCandidate(tags)) return null;

  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;

  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  const category = mapCategory(tags);

  return {
    externalId: `${element.type}/${element.id}`,
    name,
    address: buildAddress(tags),
    latitude,
    longitude,
    category: category ?? "Unmapped",
    categoryStatus: category ? "mapped" : "unmapped",
    sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
  };
}

function buildQuery(area: AreaName): string {
  const meta = AREA_META[area];
  const radiusMeters = Math.round(meta.radiusKm * 1000);
  const keyPattern = BUSINESS_TAG_KEYS.join("|");

  return `
[out:json][timeout:25];
(
  nwr(around:${radiusMeters},${meta.center.lat},${meta.center.lng})["name"][~"^(${keyPattern})$"~"."];
);
out center tags;
`.trim();
}

async function fetchFromOverpass(area: AreaName): Promise<OsmPreview> {
  const now = Date.now();

  if (now - lastProviderRequestAt < PROVIDER_COOLDOWN_MS) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "OpenStreetMap provider is cooling down. Please try again shortly.",
    });
  }

  lastProviderRequestAt = now;

  let response: Response;

  try {
    response = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "User-Agent": "GRIDSCOUT/1.0 (OpenStreetMap business discovery preview)",
      },
      body: new URLSearchParams({ data: buildQuery(area) }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message:
        error instanceof Error && error.name === "TimeoutError"
          ? "OpenStreetMap discovery timed out. Please retry shortly."
          : "Could not connect to the OpenStreetMap discovery provider.",
      cause: error,
    });
  }

  if (response.status === 429 || response.status === 504) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "OpenStreetMap is busy. Please wait and retry.",
    });
  }

  if (!response.ok) {
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: `OpenStreetMap returned HTTP ${response.status}. Please retry later.`,
    });
  }

  let payload: OverpassResponse;

  try {
    payload = (await response.json()) as OverpassResponse;
  } catch {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "OpenStreetMap returned an invalid response.",
    });
  }

  if (!Array.isArray(payload.elements)) {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "OpenStreetMap response did not contain a valid element list.",
    });
  }

  const unique = new Map<string, OsmCandidate>();

  for (const element of payload.elements) {
    const candidate = normalizeElement(element);
    if (candidate && !unique.has(candidate.externalId)) {
      unique.set(candidate.externalId, candidate);
    }
  }

  const allCandidates = [...unique.values()];
  const candidates = allCandidates.slice(0, MAX_CANDIDATES);
  const included = candidates.filter(
    (candidate) => candidate.categoryStatus === "mapped",
  ).length;
  const needsReview = candidates.length - included;

  return {
    area,
    fetchedAt: new Date().toISOString(),
    totalReturned: payload.elements.length,
    included,
    needsReview,
    skipped: Math.max(0, payload.elements.length - candidates.length),
    truncated: allCandidates.length > MAX_CANDIDATES,
    candidates,
  };
}

export async function previewOsm(area: AreaName): Promise<OsmPreview> {
  const cached = cache.get(area);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const existingRequest = inFlight.get(area);
  if (existingRequest) return existingRequest;

  const request = fetchFromOverpass(area)
    .then((data) => {
      cache.set(area, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        data,
      });
      return data;
    })
    .finally(() => {
      inFlight.delete(area);
    });

  inFlight.set(area, request);
  return request;
}

