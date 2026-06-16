import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type {
  profiles,
  providerProfiles,
  categories,
  jobs,
  jobDispatch,
  reviews,
  messages,
  commissionLedger,
  notifications,
} from "@/lib/db/schema";

/* Tipos inferidos del schema Drizzle (regla no negociable #2: nada de `any`). */
export type Profile = InferSelectModel<typeof profiles>;
export type ProviderProfile = InferSelectModel<typeof providerProfiles>;
export type Category = InferSelectModel<typeof categories>;
export type Job = InferSelectModel<typeof jobs>;
export type NewJob = InferInsertModel<typeof jobs>;
export type JobDispatch = InferSelectModel<typeof jobDispatch>;
export type Review = InferSelectModel<typeof reviews>;
export type Message = InferSelectModel<typeof messages>;
export type CommissionEntry = InferSelectModel<typeof commissionLedger>;
export type Notification = InferSelectModel<typeof notifications>;

export type Role = Profile["role"];
export type JobStatus = Job["status"];
export type JobType = Job["type"];
export type PaymentMethod = Job["paymentMethod"];
export type PaymentStatus = Job["paymentStatus"];
