// contracts/grid.ts

export const AREA_LIST = [
  "Nairobi CBD", "Westlands", "Kilimani", "Karen", "Nakuru CBD",
] as const;

export type AreaName = (typeof AREA_LIST)[number];
export const AREA_META: Record<
  AreaName,
  { center: { lat: number; lng: number }; radiusKm: number; density: number; demand: number }
> = {
  "Nairobi CBD": { center: { lat: -1.2864, lng: 36.8172 }, radiusKm: 3, density: 1.0, demand: 1.2 },
  "Westlands": { center: { lat: -1.2635, lng: 36.8023 }, radiusKm: 4, density: 0.9, demand: 1.1 },
  "Kilimani": { center: { lat: -1.292, lng: 36.787 }, radiusKm: 4, density: 0.8, demand: 1.0 },
  "Karen": { center: { lat: -1.3192, lng: 36.7058 }, radiusKm: 6, density: 0.4, demand: 0.7 },
  "Nakuru CBD": { center: { lat: -0.3031, lng: 36.08 }, radiusKm: 5, density: 0.6, demand: 0.8 },
};

export const CATEGORY_LIST = [
  "dentist", "plumber", "lawyer", "real_estate", "restaurant", "salon",
  "barbershop", "gym", "pharmacy", "clinic", "optician", "veterinary",
  "physiotherapy", "hotel", "garage", "car_wash", "car_dealer", "electrician",
  "cleaning", "security", "accountant", "insurance", "school", "daycare",
  "driving_school", "travel_agency", "photographer", "event_planner", "caterer",
  "florist", "bakery", "butchery", "hardware", "furniture", "interior_design",
  "architect", "construction", "printing", "it_services", "courier", "moving",
  "laundry", "tailor", "coworking", "pest_control", "solar", "towing",
] as const;

export type CategoryName = (typeof CATEGORY_LIST)[number];

export const CATEGORY_META: Record<
  CategoryName,
  { label: string; keyword: string; monthlySearches: [number, number]; ticketKes: [number, number] }
> = {
  dentist:         { label: "Dentists",        keyword: "dentist near me",           monthlySearches: [800, 2500],   ticketKes: [3000, 15000] },
  plumber:         { label: "Plumbers",        keyword: "emergency plumber",         monthlySearches: [400, 1500],   ticketKes: [1500, 8000] },
  lawyer:          { label: "Law Firms",       keyword: "law firm near me",          monthlySearches: [300, 1200],   ticketKes: [10000, 50000] },
  real_estate:     { label: "Real Estate",     keyword: "houses for sale",           monthlySearches: [1500, 5000],  ticketKes: [50000, 500000] },
  restaurant:      { label: "Restaurants",     keyword: "best restaurants near me",  monthlySearches: [2000, 8000],  ticketKes: [800, 4000] },
  salon:           { label: "Salons",          keyword: "salon near me",             monthlySearches: [500, 2000],   ticketKes: [1000, 5000] },
  barbershop:      { label: "Barbershops",     keyword: "barbershop near me",        monthlySearches: [500, 2000],   ticketKes: [500, 2000] },
  gym:             { label: "Gyms",            keyword: "gym near me",               monthlySearches: [300, 1000],   ticketKes: [3000, 10000] },
  pharmacy:        { label: "Pharmacies",      keyword: "pharmacy near me",          monthlySearches: [1000, 4000],  ticketKes: [500, 3000] },
  clinic:          { label: "Clinics",         keyword: "medical clinic",            monthlySearches: [600, 2000],   ticketKes: [2000, 10000] },
  optician:        { label: "Opticians",       keyword: "optician near me",          monthlySearches: [300, 1000],   ticketKes: [4000, 20000] },
  veterinary:      { label: "Vets",            keyword: "vet near me",               monthlySearches: [200, 800],    ticketKes: [2000, 8000] },
  physiotherapy:   { label: "Physiotherapy",   keyword: "physiotherapy near me",     monthlySearches: [200, 600],    ticketKes: [3000, 8000] },
  hotel:           { label: "Hotels",          keyword: "hotels in nairobi",         monthlySearches: [1000, 4000],  ticketKes: [8000, 30000] },
  garage:          { label: "Garages",         keyword: "car garage near me",        monthlySearches: [500, 1500],   ticketKes: [3000, 15000] },
  car_wash:        { label: "Car Washes",      keyword: "car wash near me",          monthlySearches: [400, 1200],   ticketKes: [500, 2000] },
  car_dealer:      { label: "Car Dealers",     keyword: "cars for sale",             monthlySearches: [800, 3000],   ticketKes: [100000, 1000000] },
  electrician:     { label: "Electricians",    keyword: "electrician near me",       monthlySearches: [300, 1000],   ticketKes: [2000, 8000] },
  cleaning:        { label: "Cleaning",        keyword: "cleaning services",         monthlySearches: [400, 1500],   ticketKes: [2000, 8000] },
  security:        { label: "Security",        keyword: "security company",          monthlySearches: [200, 800],    ticketKes: [5000, 20000] },
  accountant:      { label: "Accountants",     keyword: "accountant near me",        monthlySearches: [300, 1200],   ticketKes: [10000, 50000] },
  insurance:       { label: "Insurance",       keyword: "insurance agency",          monthlySearches: [400, 1500],   ticketKes: [5000, 30000] },
  school:          { label: "Schools",         keyword: "private school near me",    monthlySearches: [600, 2000],   ticketKes: [30000, 200000] },
  daycare:         { label: "Daycares",        keyword: "daycare near me",           monthlySearches: [400, 1200],   ticketKes: [10000, 40000] },
  driving_school:  { label: "Driving Schools", keyword: "driving school near me",    monthlySearches: [300, 800],    ticketKes: [10000, 30000] },
  travel_agency:   { label: "Travel Agencies", keyword: "travel agency",             monthlySearches: [500, 2000],   ticketKes: [20000, 100000] },
  photographer:    { label: "Photographers",   keyword: "photographer near me",      monthlySearches: [300, 1000],   ticketKes: [10000, 50000] },
  event_planner:   { label: "Event Planners",  keyword: "event planner",             monthlySearches: [300, 1000],   ticketKes: [20000, 100000] },
  caterer:         { label: "Caterers",        keyword: "catering services",         monthlySearches: [300, 1200],   ticketKes: [10000, 50000] },
  florist:         { label: "Florists",        keyword: "flower shop near me",       monthlySearches: [300, 800],    ticketKes: [2000, 10000] },
  bakery:          { label: "Bakeries",        keyword: "bakery near me",            monthlySearches: [600, 2000],   ticketKes: [500, 3000] },
  butchery:        { label: "Butcheries",      keyword: "butchery near me",          monthlySearches: [600, 2000],   ticketKes: [500, 2500] },
  hardware:        { label: "Hardware",        keyword: "hardware store",            monthlySearches: [500, 2000],   ticketKes: [1000, 10000] },
  furniture:       { label: "Furniture",       keyword: "furniture store",           monthlySearches: [400, 1500],   ticketKes: [5000, 30000] },
  interior_design: { label: "Interior Design", keyword: "interior designer",         monthlySearches: [200, 800],    ticketKes: [50000, 200000] },
  architect:       { label: "Architects",      keyword: "architect near me",         monthlySearches: [200, 600],    ticketKes: [50000, 300000] },
  construction:    { label: "Construction",    keyword: "construction company",      monthlySearches: [500, 2000],   ticketKes: [100000, 1000000] },
  printing:        { label: "Printing",        keyword: "printing services",         monthlySearches: [300, 1000],   ticketKes: [2000, 10000] },
  it_services:     { label: "IT Services",     keyword: "IT support near me",        monthlySearches: [400, 1500],   ticketKes: [10000, 50000] },
  courier:         { label: "Couriers",        keyword: "courier services",          monthlySearches: [500, 2000],   ticketKes: [500, 3000] },
  moving:          { label: "Movers",          keyword: "movers near me",            monthlySearches: [300, 1000],   ticketKes: [5000, 30000] },
  laundry:         { label: "Laundry",         keyword: "laundry services",          monthlySearches: [400, 1500],   ticketKes: [500, 2500] },
  tailor:          { label: "Tailors",         keyword: "tailor near me",            monthlySearches: [300, 1000],   ticketKes: [2000, 10000] },
  coworking:       { label: "Coworking",       keyword: "coworking space",           monthlySearches: [200, 800],    ticketKes: [10000, 50000] },
  pest_control:    { label: "Pest Control",    keyword: "pest control services",     monthlySearches: [200, 700],    ticketKes: [3000, 15000] },
  solar:           { label: "Solar",           keyword: "solar installation",        monthlySearches: [300, 1000],   ticketKes: [50000, 300000] },
  towing:          { label: "Towing",          keyword: "towing services",           monthlySearches: [200, 800],    ticketKes: [3000, 10000] },
};

export const LEAD_STATUS_LIST = ["new", "contacted", "replied", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUS_LIST)[number];

export const CREDIT_PRICE_KES = 500;
export const CREDIT_BUNDLES = [1, 5, 12] as const;

export interface ScoreBreakdown { maps: number; web: number; visibility: number; }
export interface BusinessScanResult {
  id: number; name: string; category: CategoryName; area: string; lat: number; lng: number;
  rating: number; reviewCount: number; website: string | null; scores: ScoreBreakdown;
  lostRevenueKes: number; estSearches: number; issues: string[];
}
export interface CompetitorInfo {
  id: number; name: string; visibilityScore: number; distanceKm: number;
  reviewCount: number; keywordRank: number | null;
}
export interface AuditDetail extends BusinessScanResult {
  phone: string; claimed: boolean; photos: number; posts: number; respondsToReviews: boolean;
  keywordRank: number | null; siteSpeed: number | null; mobileOk: boolean | null;
  metaOk: boolean | null; avgTicketKes: number; competitors: CompetitorInfo[];
  leadStatus: LeadStatus | null; leadId: number | null;
}
export interface LeadDto {
  id: number; status: LeadStatus; notes: string | null; pitch: string | null;
  createdAt: Date; business: BusinessScanResult & { phone: string };
}
export interface WalletDto {
  credits: number;
  transactions: { id: number; kind: "purchase" | "unlock" | "bonus"; credits: number;
    amountKes: number; status: "pending" | "completed" | "failed"; mpesaRef: string | null; createdAt: Date; }[];
}