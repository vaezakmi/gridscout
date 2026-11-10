// GridScout shared contracts (frontend <-> backend)

export const AREA_LIST = [
  "Nairobi CBD",
  "Westlands",
  "Kilimani",
  "Karen",
  "Nakuru CBD",
] as const;

export const CATEGORY_LIST = [
  "dentist",
  "plumber",
  "lawyer",
  "real_estate",
  "restaurant",
  "salon",
] as const;

export type AreaName = (typeof AREA_LIST)[number];
export type CategoryName = (typeof CATEGORY_LIST)[number];

export const CATEGORY_META: Record<
  CategoryName,
  { label: string; keyword: string }
> = {
  dentist: { label: "Dentists", keyword: "dentist near me" },
  plumber: { label: "Plumbers", keyword: "emergency plumber" },
  lawyer: { label: "Law Firms", keyword: "law firm near me" },
  real_estate: { label: "Real Estate", keyword: "houses for sale" },
  restaurant: { label: "Restaurants", keyword: "best restaurants near me" },
  salon: { label: "Salons", keyword: "salon near me" },
};

export const LEAD_STATUS_LIST = [
  "new",
  "contacted",
  "replied",
  "won",
  "lost",
] as const;
export type LeadStatus = (typeof LEAD_STATUS_LIST)[number];

export const CREDIT_PRICE_KES = 500; // 1 lead credit, per proposal
export const CREDIT_BUNDLES = [1, 5, 12] as const;

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
