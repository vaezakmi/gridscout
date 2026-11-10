import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  int,
  double,
  boolean,
  timestamp,
  bigint,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// Import the canonical lists directly from contracts — single source of truth
import { AREA_LIST, CATEGORY_LIST, LEAD_STATUS_LIST } from "../contracts/grid";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
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
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ---- GridScout domain tables ----

export const businesses = mysqlTable("businesses", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  // References the 47-category list from contracts/grid.ts
  category: mysqlEnum("category", CATEGORY_LIST).notNull(),
  area: varchar("area", { length: 64 }).notNull(),
  lat: double("lat").notNull(),
  lng: double("lng").notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  website: varchar("website", { length: 255 }),
  // Google Business Profile signals
  claimed: boolean("claimed").notNull().default(false),
  rating: double("rating").notNull().default(0),
  reviewCount: int("reviewCount").notNull().default(0),
  photos: int("photos").notNull().default(0),
  posts: int("posts").notNull().default(0),
  respondsToReviews: boolean("respondsToReviews").notNull().default(false),
  // Web presence signals
  keywordRank: int("keywordRank"),
  siteSpeed: double("siteSpeed"),
  mobileOk: boolean("mobileOk"),
  metaOk: boolean("metaOk"),
  // Market sizing
  estSearches: int("estSearches").notNull().default(0),
  avgTicketKes: int("avgTicketKes").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Business = typeof businesses.$inferSelect;

export const wallets = mysqlTable("wallets", {
  userId: bigint("userId", { mode: "number", unsigned: true })
    .primaryKey()
    .references(() => users.id),
  credits: int("credits").notNull().default(0),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Wallet = typeof wallets.$inferSelect;

// LEAD_STATUSES now aliases the contract list — kept exported for back-compat
export const LEAD_STATUSES = LEAD_STATUS_LIST;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const leads = mysqlTable(
  "leads",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    businessId: bigint("businessId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => businesses.id),
    status: mysqlEnum("status", LEAD_STATUS_LIST).notNull().default("new"),
    notes: text("notes"),
    // Saved AI cold-pitch; surfaced in AuditDetail.pitch and LeadDto.pitch
    pitch: text("pitch"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("leads_user_business_idx").on(table.userId, table.businessId),
  ],
);

export type Lead = typeof leads.$inferSelect;

export const creditTxns = mysqlTable("credit_txns", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id),
  kind: mysqlEnum("kind", ["purchase", "unlock", "bonus"]).notNull(),
  credits: int("credits").notNull(),
  amountKes: int("amountKes").notNull().default(0),
  status: mysqlEnum("status", ["pending", "completed", "failed"])
    .notNull()
    .default("completed"),
  mpesaRef: varchar("mpesaRef", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditTxn = typeof creditTxns.$inferSelect;