import {
  mysqlTable,
  mysqlEnum,
  varchar,
  text,
  int,
  double,
  boolean,
  timestamp,
  index,
  uniqueIndex,
  foreignKey,
  json,
} from "drizzle-orm/mysql-core";

// Import the canonical lists directly from contracts â€” single source of truth
import { LEAD_STATUS_LIST, type CategoryName } from "../contracts/grid";

// Preserve the historical MySQL ENUM order; application ordering remains in contracts/grid.ts.
const DATABASE_CATEGORY_LIST = [
  "dentist", "plumber", "lawyer", "real_estate", "restaurant",
  "salon", "barbershop", "gym", "pharmacy", "clinic", "optician",
  "veterinary", "physiotherapy", "hotel", "garage", "car_wash",
  "car_dealer", "electrician", "cleaning", "security", "accountant",
  "insurance", "school", "daycare", "driving_school", "travel_agency",
  "photographer", "event_planner", "caterer", "florist", "bakery",
  "butchery", "hardware", "furniture", "interior_design", "architect",
  "construction", "printing", "it_services", "courier", "moving",
  "laundry", "tailor", "coworking", "pest_control", "solar", "towing",
] as const satisfies readonly CategoryName[];

type Assert<T extends true> = T;
type MissingDatabaseCategories = Exclude<
  CategoryName,
  (typeof DATABASE_CATEGORY_LIST)[number]
>;
const categoryCoverageCheck: Assert<
  MissingDatabaseCategories extends never ? true : false
> = true;
void categoryCoverageCheck;

export const users = mysqlTable("users", {
  id: int("id", { unsigned: true }).autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 255 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  provider: mysqlEnum("provider", ["email", "google", "github", "apple"])
    .notNull()
    .default("email"),
  providerId: varchar("providerId", { length: 255 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .onUpdateNow(),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("email").on(table.email),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ---- GridScout domain tables ----

export const businesses = mysqlTable("businesses", {
  id: int("id", { unsigned: true }).autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  // References the canonical category list from contracts/grid.ts.
  category: mysqlEnum("category", DATABASE_CATEGORY_LIST).notNull(),
  area: varchar("area", { length: 64 }).notNull(),
  lat: double("lat").notNull(),
  lng: double("lng").notNull(),

  // Provenance and review state. Existing records remain legacy until reviewed.
  source: mysqlEnum("source", ["legacy", "seed", "openstreetmap"])
    .notNull()
    .default("legacy"),
  externalId: varchar("externalId", { length: 128 }),
  sourceUrl: varchar("sourceUrl", { length: 512 }),
  address: varchar("address", { length: 512 }),
  lastSyncedAt: timestamp("lastSyncedAt"),
  verificationStatus: mysqlEnum("verificationStatus", [
    "imported",
    "reviewed",
    "verified",
  ])
    .notNull()
    .default("imported"),
  isDemo: boolean("isDemo").notNull().default(false),

  // A missing website URL is not proof that a business has no website.
  website: varchar("website", { length: 255 }),
  websiteStatus: mysqlEnum("websiteStatus", [
    "unknown",
    "present",
    "not_found",
  ])
    .notNull()
    .default("unknown"),

  // Google Business Profile signals: null means not measured.
  phone: varchar("phone", { length: 32 }),
  claimed: boolean("claimed"),
  rating: double("rating"),
  reviewCount: int("reviewCount"),
  photos: int("photos"),
  posts: int("posts"),
  respondsToReviews: boolean("respondsToReviews"),

  // Web presence signals: null means not measured.
  keywordRank: int("keywordRank"),
  siteSpeed: double("siteSpeed"),
  mobileOk: boolean("mobileOk"),
  metaOk: boolean("metaOk"),

  // Market sizing: null means no supported estimate is available.
  estSearches: int("estSearches"),
  avgTicketKes: int("avgTicketKes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("businesses_area_idx").on(table.area),
  index("businesses_category_idx").on(table.category),
]);

export type Business = typeof businesses.$inferSelect;

export const wallets = mysqlTable("wallets", {
  userId: int("userId", { unsigned: true })
    .primaryKey(),
  credits: int("credits").notNull().default(0),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .onUpdateNow(),
}, (table) => [
  foreignKey({
    name: "wallets_user_fk",
    columns: [table.userId],
    foreignColumns: [users.id],
  }).onDelete("cascade"),
]);

export type Wallet = typeof wallets.$inferSelect;

// LEAD_STATUSES now aliases the contract list â€” kept exported for back-compat
export const LEAD_STATUSES = LEAD_STATUS_LIST;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const leads = mysqlTable(
  "leads",
  {
    id: int("id", { unsigned: true }).autoincrement().primaryKey(),
    userId: int("userId", { unsigned: true })
      .notNull(),
    businessId: int("businessId", { unsigned: true })
      .notNull(),
    status: mysqlEnum("status", LEAD_STATUS_LIST).notNull().default("new"),
    notes: text("notes"),
    // Saved AI cold-pitch; surfaced in AuditDetail.pitch and LeadDto.pitch
    pitch: text("pitch"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("leads_user_business_idx").on(table.userId, table.businessId),

    index("leads_status_idx").on(table.status),
    index("leads_user_idx").on(table.userId),
    foreignKey({
      name: "leads_user_fk",
      columns: [table.userId],
      foreignColumns: [users.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "leads_business_fk",
      columns: [table.businessId],
      foreignColumns: [businesses.id],
    }).onDelete("cascade"),
  ],
);

export type Lead = typeof leads.$inferSelect;

export const creditTxns = mysqlTable("credit_txns", {
  id: int("id", { unsigned: true }).autoincrement().primaryKey(),
  userId: int("userId", { unsigned: true })
    .notNull(),
  kind: mysqlEnum("kind", ["purchase", "unlock", "bonus", "fix_request", "refund"]).notNull(),
  credits: int("credits").notNull(),
  amountKes: int("amountKes").notNull().default(0),
  status: mysqlEnum("status", ["pending", "completed", "failed"])
    .notNull()
    .default("completed"),
  mpesaRef: varchar("mpesaRef", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("credit_txns_mpesa_idx").on(table.mpesaRef),
  index("credit_txns_user_idx").on(table.userId),
  foreignKey({
    name: "credit_txns_user_fk",
    columns: [table.userId],
    foreignColumns: [users.id],
  }).onDelete("cascade"),
]);

export type CreditTxn = typeof creditTxns.$inferSelect;

// ---- Done-For-You Fix Requests ----

export const FIX_REQUEST_STATUSES = [
  "new",
  "quoted",
  "in_progress",
  "delivered",
  "declined",
  "cancelled",
] as const;

export const fixRequests = mysqlTable("fix_requests", {
  id: int("id", { unsigned: true }).autoincrement().primaryKey(),
  userId: int("userId", { unsigned: true })
    .notNull(),
  leadId: int("leadId", { unsigned: true })
    .notNull(),
  status: mysqlEnum("status", FIX_REQUEST_STATUSES).notNull().default("new"),
  packages: json("packages").$type<string[]>().notNull(),
  totalKes: int("totalKes").notNull(),
  feeCredits: int("feeCredits").notNull(),
  quotedKes: int("quotedKes"),
  note: text("note"),
  adminNote: text("adminNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [


  foreignKey({
    name: "fix_requests_user_fk",
    columns: [table.userId],
    foreignColumns: [users.id],
  }).onDelete("cascade"),
  foreignKey({
    name: "fix_requests_lead_fk",
    columns: [table.leadId],
    foreignColumns: [leads.id],
  }).onDelete("cascade"),
]);

export type FixRequest = typeof fixRequests.$inferSelect;
