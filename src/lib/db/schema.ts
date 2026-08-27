import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  jsonb,
  primaryKey,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { geographyPoint } from "./geography";

/* ────────────────────────────────────────────────────────────
   AlToque: Schema Drizzle (Sección 4 del blueprint)
   Tras `db:migrate`, correr drizzle/postgis.sql (PostGIS, índices
   GIST, find_nearby_providers, RLS) y drizzle/seed-categories.sql.
   ──────────────────────────────────────────────────────────── */

// ── Enums ──
export const roleEnum = pgEnum("role", ["client", "provider", "admin"]);
export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "approved",
  "rejected",
]);
export const jobTypeEnum = pgEnum("job_type", ["scheduled", "urgent"]);
export const jobStatusEnum = pgEnum("job_status", [
  "requested",
  "broadcasting",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
  "expired",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "transfer",
  "card",
]);
export const dispatchStatusEnum = pgEnum("dispatch_status", [
  "notified",
  "accepted",
  "declined",
  "expired",
]);

// ── profiles (extiende auth.users 1:1 por id; lo crea un trigger al registrarse) ──
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // = auth.users.id
  role: roleEnum("role").notNull().default("client"),
  fullName: text("full_name"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── provider_profiles (1:1 con profiles de rol provider) ──
export const providerProfiles = pgTable(
  "provider_profiles",
  {
    profileId: uuid("profile_id")
      .primaryKey()
      .references(() => profiles.id, { onDelete: "cascade" }),
    bio: text("bio"),
    yearsExperience: integer("years_experience"),
    verificationStatus: verificationStatusEnum("verification_status")
      .notNull()
      .default("pending"),
    idDocumentUrl: text("id_document_url"), // bucket privado (DNI)
    selfieUrl: text("selfie_url"), // bucket privado
    baseLocation: geographyPoint("base_location"), // punto base p/ matching
    serviceRadiusKm: integer("service_radius_km").notNull().default(10),
    isOnline: boolean("is_online").notNull().default(false),
    ratingAvg: numeric("rating_avg", { precision: 2, scale: 1 })
      .notNull()
      .default("0.0"),
    jobsCompleted: integer("jobs_completed").notNull().default(0),
  },
  (t) => [
    index("idx_provider_online").on(t.isOnline, t.verificationStatus),
  ],
);

// ── categories (oficios) ──
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  icon: text("icon"), // nombre de ícono lucide
  allowsUrgent: boolean("allows_urgent").notNull().default(true),
});

// ── provider_categories (N:N profesional ↔ oficio) ──
export const providerCategories = pgTable(
  "provider_categories",
  {
    providerId: uuid("provider_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.providerId, t.categoryId] })],
);

// ── jobs (entidad central: el "pedido") ──
export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => profiles.id),
    providerId: uuid("provider_id").references(() => profiles.id), // null hasta asignar
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    type: jobTypeEnum("type").notNull(),
    status: jobStatusEnum("status").notNull().default("requested"),
    title: text("title").notNull(),
    description: text("description"),
    photos: text("photos").array(), // bucket público
    addressText: text("address_text"),
    location: geographyPoint("location"), // dónde se ejecuta
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }), // null si urgente
    // `payment_method` y `final_price` son datos INFORMATIVOS del acuerdo
    // entre las partes: la plataforma no participa del cobro del servicio
    // (spec 2026-07-31-modelo-suscripcion).
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    finalPrice: numeric("final_price", { precision: 12, scale: 2 }),
    cancelReason: text("cancel_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_jobs_status").on(t.status),
    index("idx_jobs_client").on(t.clientId),
    index("idx_jobs_provider").on(t.providerId),
  ],
);

// ── job_dispatch (broadcast de urgencias) ──
export const jobDispatch = pgTable(
  "job_dispatch",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: dispatchStatusEnum("status").notNull().default("notified"),
    distanceKm: numeric("distance_km"),
    notifiedAt: timestamp("notified_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (t) => [
    unique("uq_dispatch_job_provider").on(t.jobId, t.providerId),
    index("idx_dispatch_provider").on(t.providerId, t.status),
  ],
);

// ── reviews (bidireccional: una por parte) ──
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => profiles.id),
    targetId: uuid("target_id")
      .notNull()
      .references(() => profiles.id),
    rating: integer("rating").notNull(), // 1–5 (check en postgis.sql)
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("uq_review_job_author").on(t.jobId, t.authorId),
    index("idx_reviews_target").on(t.targetId),
  ],
);

// ── messages (chat por trabajo) ──
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => profiles.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [index("idx_messages_job").on(t.jobId)],
);

// ── push_subscriptions ──
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── notifications ──
// `read_at` (timestamp) cumple el rol de `is_read` (null = no leída) y
// además dice CUÁNDO se leyó. `link` es la ruta interna a la que navega
// la campanita al hacer click.
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"),
  data: jsonb("data"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── audit_logs (historial de seguridad, inmutable) ──
// Sin FK a profiles a propósito: los logs sobreviven al borrado de la
// cuenta (purga de huérfanos) y `user_id` es null en eventos pre-login
// (ej. failed_login). Solo se INSERTA desde el servidor (Drizzle/owner);
// el cliente únicamente puede LEER los suyos (RLS en
// docs/audit-notifications-setup.sql).
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id"),
    action: text("action").notNull(), // 'login' | 'failed_login' | 'logout' | 'password_change' | 'identity_link' | ...
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("idx_audit_user_created").on(t.userId, t.createdAt)],
);

/* ── Relations (para queries relacionales de Drizzle) ── */
export const profilesRelations = relations(profiles, ({ one, many }) => ({
  providerProfile: one(providerProfiles, {
    fields: [profiles.id],
    references: [providerProfiles.profileId],
  }),
  jobsAsClient: many(jobs, { relationName: "client" }),
  jobsAsProvider: many(jobs, { relationName: "provider" }),
}));

export const providerProfilesRelations = relations(
  providerProfiles,
  ({ one, many }) => ({
    profile: one(profiles, {
      fields: [providerProfiles.profileId],
      references: [profiles.id],
    }),
    categories: many(providerCategories),
  }),
);

export const categoriesRelations = relations(categories, ({ many }) => ({
  providers: many(providerCategories),
  jobs: many(jobs),
}));

export const providerCategoriesRelations = relations(
  providerCategories,
  ({ one }) => ({
    provider: one(providerProfiles, {
      fields: [providerCategories.providerId],
      references: [providerProfiles.profileId],
    }),
    category: one(categories, {
      fields: [providerCategories.categoryId],
      references: [categories.id],
    }),
  }),
);

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  client: one(profiles, {
    fields: [jobs.clientId],
    references: [profiles.id],
    relationName: "client",
  }),
  provider: one(profiles, {
    fields: [jobs.providerId],
    references: [profiles.id],
    relationName: "provider",
  }),
  category: one(categories, {
    fields: [jobs.categoryId],
    references: [categories.id],
  }),
  dispatch: many(jobDispatch),
  reviews: many(reviews),
  messages: many(messages),
}));

export const jobDispatchRelations = relations(jobDispatch, ({ one }) => ({
  job: one(jobs, { fields: [jobDispatch.jobId], references: [jobs.id] }),
  provider: one(profiles, {
    fields: [jobDispatch.providerId],
    references: [profiles.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  job: one(jobs, { fields: [messages.jobId], references: [jobs.id] }),
  sender: one(profiles, {
    fields: [messages.senderId],
    references: [profiles.id],
  }),
}));
