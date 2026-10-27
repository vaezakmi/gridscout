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
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
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

export const AREAS = [
  "Nairobi CBD",
  "Westlands",
  "Kilimani",
  "Karen",
  "Nakuru CBD",
] as const;

export const CATEGORIES = [
  "dentist",
  "plumber",
  "lawyer",
  "real_estate",
  "restaurant",
  "salon",
] as const;

export const businesses = mysqlTable("businesses", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: mysqlEnum("category", CATEGORIES).notNull(),
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
  keywordRank: int("keywordRank"), // position for money keyword, null = not in top 50
  siteSpeed: double("siteSpeed"), // Lighthouse perf 0-100, null = no site
  mobileOk: boolean("mobileOk"),
  metaOk: boolean("metaOk"),
  // Market sizing
  estSearches: int("estSearches").notNull().default(0), // monthly local searches
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

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "replied",
  "won",
  "lost",
] as const;

export const leads = mysqlTable("leads", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id),
  businessId: bigint("businessId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => businesses.id),
  status: mysqlEnum("status", LEAD_STATUSES).notNull().default("new"),
  notes: text("notes"),
  pitch: text("pitch"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;

export const creditTxns = mysqlTable("credit_txns", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id),
  kind: mysqlEnum("kind", ["purchase", "unlock", "bonus"]).notNull(),
  credits: int("credits").notNull(), // +credit purchase/bonus, -unlock spend
  amountKes: int("amountKes").notNull().default(0),
  status: mysqlEnum("status", ["pending", "completed", "failed"])
    .notNull()
    .default("completed"),
  mpesaRef: varchar("mpesaRef", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditTxn = typeof creditTxns.$inferSelect;
