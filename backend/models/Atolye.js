import { sql } from "drizzle-orm"
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core"
import { createInsertSchema } from "drizzle-zod"

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username")
    .notNull()
    .unique(),
  password: text("password").notNull()
})

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
})

export const atolyeUsers = pgTable("atolye_users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username")
    .notNull()
    .unique(),
  password: text("password").notNull(),
  role: text("role").notNull(),
  name: text("name").notNull()
})

export const atolyeWorks = pgTable("atolye_works", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  model: text("model").notNull(),
  color: text("color").notNull(),
  leatherType: text("leather_type").notNull(),
  size: text("size").notNull(),
  company: text("company"),
  notes: text("notes"),
  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull()
})

export const insertAtolyeUserSchema = createInsertSchema(atolyeUsers).omit({
  id: true
})

export const insertAtolyeWorkSchema = createInsertSchema(atolyeWorks).omit({
  id: true,
  createdAt: true
})
