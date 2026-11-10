import { eq, and } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { users, type User, type InsertUser } from "../../db/schema";

export const db = {
  users: {
    async findByEmail(email: string): Promise<User | null> {
      const rows = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
      return rows[0] ?? null;
    },
    async findById(id: number): Promise<User | null> {
      const rows = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
      return rows[0] ?? null;
    },
    async findByProvider(
      provider: "email" | "google" | "github" | "apple",
      providerId: string,
    ): Promise<User | null> {
      const rows = await getDb()
        .select()
        .from(users)
        .where(and(eq(users.provider, provider), eq(users.providerId, providerId)))
        .limit(1);
      return rows[0] ?? null;
    },
    async create(data: InsertUser): Promise<User> {
      const [{ id }] = await getDb().insert(users).values(data).$returningId();
      const created = await this.findById(id);
      if (!created) throw new Error("Failed to create user");
      return created;
    },
    async update(id: number, data: Partial<InsertUser>): Promise<User> {
      await getDb().update(users).set(data).where(eq(users.id, id));
      const updated = await this.findById(id);
      if (!updated) throw new Error("Failed to update user");
      return updated;
    },
  },
};