// lib/db/schema/index.ts

import {
  pgTable,
  text,
  serial,
  integer,
  numeric,
  timestamp,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "processing",
  "done",
  "picked_up",
]);

// ─── Users (Admin) ────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("admin").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Customers ────────────────────────────────────────────────────────────────
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  address: text("address").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Soaps (Deterjen) ─────────────────────────────────────────────────────────
export const soaps = pgTable("soaps", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand"),
  pricePerKg: numeric("price_per_kg", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Pewangi (Fabric Softener) ────────────────────────────────────────────────
export const pewangi = pgTable("pewangi", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand"),
  pricePerKg: numeric("price_per_kg", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Service Pricing ──────────────────────────────────────────────────────────
export const servicePricing = pgTable("service_pricing", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  basePricePerKg: numeric("base_price_per_kg", {
    precision: 10,
    scale: 2,
  }).notNull(),
  category: text("category").notNull().default("package"),
  // "per_kg" | "per_pcs"
  pricingUnit: text("pricing_unit").notNull().default("per_kg"),
  minimumKg: text("minimum_kg"),
  duration: text("duration"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Orders ───────────────────────────────────────────────────────────────────
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerId: integer("customer_id")
    .references(() => customers.id)
    .notNull(),
  weightKg: numeric("weight_kg", { precision: 6, scale: 2 }).notNull(),
  soapId: integer("soap_id").references(() => soaps.id),
  pewangiId: integer("pewangi_id").references(() => pewangi.id),
  servicePricingId: integer("service_pricing_id").references(
    () => servicePricing.id
  ),
  basePricePerKg: numeric("base_price_per_kg", {
    precision: 10,
    scale: 2,
  }).notNull(),
  soapCost: numeric("soap_cost", { precision: 10, scale: 2 }).default("0"),
  pewangiCost: numeric("pewangi_cost", { precision: 10, scale: 2 }).default("0"),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum("status").default("pending").notNull(),
  notes: text("notes"),
  estimatedDoneAt: timestamp("estimated_done_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Relations ────────────────────────────────────────────────────────────────
export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  soap: one(soaps, {
    fields: [orders.soapId],
    references: [soaps.id],
  }),
  pewangi: one(pewangi, {
    fields: [orders.pewangiId],
    references: [pewangi.id],
  }),
  servicePricing: one(servicePricing, {
    fields: [orders.servicePricingId],
    references: [servicePricing.id],
  }),
}));

// ─── Exported Types ───────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Soap = typeof soaps.$inferSelect;
export type NewSoap = typeof soaps.$inferInsert;
export type Pewangi = typeof pewangi.$inferSelect;
export type NewPewangi = typeof pewangi.$inferInsert;
export type ServicePricing = typeof servicePricing.$inferSelect;
export type NewServicePricing = typeof servicePricing.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;