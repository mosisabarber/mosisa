/**
 * Drizzle schema — single source of truth for the database (AGENTS.md §3).
 *
 * Field names follow AGENTS.md §3 exactly. Do not add tables or columns not
 * defined in AGENTS.md.
 */
import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// App tables (AGENTS.md §3)
// ---------------------------------------------------------------------------

export const barbers = pgTable("barbers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  specialties: text("specialties").array(),
  bufferMinutes: integer("buffer_minutes").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  durationMinutes: integer("duration_minutes").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

/** Shop-wide default hours — one row per day_of_week (0=Sunday ... 6=Saturday). */
export const workingHours = pgTable("working_hours", {
  id: uuid("id").primaryKey().defaultRandom(),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
});

/** Per-barber override of working_hours. */
export const barberSchedules = pgTable("barber_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  barberId: uuid("barber_id")
    .notNull()
    .references(() => barbers.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: time("start_time"),
  endTime: time("end_time"),
  isOff: boolean("is_off").notNull().default(false),
});

/** Holidays, closures, personal time off. Nullable barber_id = whole shop. */
export const blockedTimes = pgTable("blocked_times", {
  id: uuid("id").primaryKey().defaultRandom(),
  barberId: uuid("barber_id").references(() => barbers.id, {
    onDelete: "cascade",
  }),
  startDatetime: timestamp("start_datetime", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
  endDatetime: timestamp("end_datetime", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
  reason: text("reason"),
});

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  barberId: uuid("barber_id")
    .notNull()
    .references(() => barbers.id),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => services.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email").notNull(),
  startDatetime: timestamp("start_datetime", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
  endDatetime: timestamp("end_datetime", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
  /** confirmed | cancelled | completed | no_show */
  status: text("status").notNull().default("confirmed"),
  /** online | walk_in */
  source: text("source").notNull().default("online"),
  /** crypto-random, NOT sequential/guessable */
  managementToken: text("management_token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Better Auth staff tables (§3: staff_users, extended with `role`).
// Staff accounts are created manually — no public staff signup (§6).
// ---------------------------------------------------------------------------

export const staffUsers = pgTable("staff_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("staff"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const staffSessions = pgTable("staff_sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => staffUsers.id, { onDelete: "cascade" }),
});

export const staffAccounts = pgTable("staff_accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => staffUsers.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const staffVerifications = pgTable("staff_verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

