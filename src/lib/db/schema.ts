import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  real,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const commutes = pgTable(
  "commutes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    routeId: text("route_id").notNull(),
    originStopId: text("origin_stop_id").notNull(),
    originStopName: text("origin_stop_name").notNull(),
    destStopId: text("dest_stop_id").notNull(),
    destStopName: text("dest_stop_name").notNull(),
    directionId: integer("direction_id").notNull(),
    walkMinutes: integer("walk_minutes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("commutes_user_idx").on(t.userId)],
);

/** Upstream response cache (MBTA / NWS) with a TTL and a stale fallback. */
export const apiCache = pgTable("api_cache", {
  key: text("key").primaryKey(),
  body: jsonb("body").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

/** Fixed-window rate limit counters. */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: integer("window_start").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

/** One row per (MBTA prediction id). Reconciled later against actual arrival. */
export const predictionLog = pgTable(
  "prediction_log",
  {
    id: serial("id").primaryKey(),
    predictionId: text("prediction_id").notNull(),
    tripId: text("trip_id"),
    routeId: text("route_id").notNull(),
    stopId: text("stop_id").notNull(),
    directionId: integer("direction_id").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    predictedAt: timestamp("predicted_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    actualAt: timestamp("actual_at", { withTimezone: true }),
    actualSource: text("actual_source"),
    delaySec: integer("delay_sec"),
    resolved: boolean("resolved").notNull().default(false),
  },
  (t) => [
    uniqueIndex("prediction_log_pid_idx").on(t.predictionId),
    index("prediction_log_open_idx").on(t.resolved, t.predictedAt),
  ],
);

/** Precomputed by the scheduled job. */
export const delayStats = pgTable(
  "delay_stats",
  {
    routeId: text("route_id").notNull(),
    hour: integer("hour").notNull(),
    avgDelaySec: real("avg_delay_sec").notNull(),
    onTimePct: real("on_time_pct").notNull(),
    samples: integer("samples").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.routeId, t.hour] })],
);
