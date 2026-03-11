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

export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "paid",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "transfer",
  "qris",
]);

// ─── Role Enum + Roles Table ──────────────────────────────────────────────────
// userRoleEnum is the canonical list of roles across the whole app.
// The `roles` table adds a human-readable description to each value and acts
// as the single reference point you can extend (e.g. add permissions later).
export const userRoleEnum = pgEnum("user_role", ["admin", "employee", "user"]);

export const roles = pgTable("roles", {
  id:          serial("id").primaryKey(),
  name:        userRoleEnum("name").notNull().unique(),
  description: text("description").notNull(),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
});

// ─── Users ────────────────────────────────────────────────────────────────────
// `role` uses the same enum so it's always in sync with the roles table.
// Default is "user" — only set to "admin"/"employee" explicitly in the DB or
// via an admin management screen.
export const users = pgTable("users", {
  id:        serial("id").primaryKey(),
  name:      text("name").notNull(),
  email:     text("email").notNull().unique(),
  password:  text("password").notNull(),
  role:      userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Customers ────────────────────────────────────────────────────────────────
export const customers = pgTable("customers", {
  id:        serial("id").primaryKey(),
  name:      text("name").notNull(),
  phone:     text("phone").notNull().unique(),
  address:   text("address").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Soaps (Deterjen) ─────────────────────────────────────────────────────────
export const soaps = pgTable("soaps", {
  id:         serial("id").primaryKey(),
  name:       text("name").notNull(),
  brand:      text("brand"),
  pricePerKg: numeric("price_per_kg", { precision: 10, scale: 2 }).notNull(),
  isActive:   boolean("is_active").default(true).notNull(),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
});

// ─── Pewangi (Fabric Softener) ────────────────────────────────────────────────
export const pewangi = pgTable("pewangi", {
  id:         serial("id").primaryKey(),
  name:       text("name").notNull(),
  brand:      text("brand"),
  pricePerKg: numeric("price_per_kg", { precision: 10, scale: 2 }).notNull(),
  isActive:   boolean("is_active").default(true).notNull(),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
});

// ─── Service Pricing ──────────────────────────────────────────────────────────
export const servicePricing = pgTable("service_pricing", {
  id:             serial("id").primaryKey(),
  name:           text("name").notNull(),
  basePricePerKg: numeric("base_price_per_kg", { precision: 10, scale: 2 }).notNull(),
  category:       text("category").notNull().default("package"),
  pricingUnit:    text("pricing_unit").notNull().default("per_kg"), // "per_kg" | "per_pcs"
  minimumKg:      text("minimum_kg"),
  duration:       text("duration"),
  notes:          text("notes"),
  isActive:       boolean("is_active").default(true).notNull(),
  createdAt:      timestamp("created_at").defaultNow().notNull(),
});

// ─── Orders ───────────────────────────────────────────────────────────────────
export const orders = pgTable("orders", {
  id:               serial("id").primaryKey(),
  orderNumber:      text("order_number").notNull().unique(),
  customerId:       integer("customer_id").references(() => customers.id).notNull(),
  weightKg:         numeric("weight_kg", { precision: 6, scale: 2 }).notNull(),
  soapId:           integer("soap_id").references(() => soaps.id),
  pewangiId:        integer("pewangi_id").references(() => pewangi.id),
  servicePricingId: integer("service_pricing_id").references(() => servicePricing.id),
  basePricePerKg:   numeric("base_price_per_kg", { precision: 10, scale: 2 }).notNull(),
  soapCost:         numeric("soap_cost",    { precision: 10, scale: 2 }).default("0"),
  pewangiCost:      numeric("pewangi_cost", { precision: 10, scale: 2 }).default("0"),
  totalPrice:       numeric("total_price",  { precision: 10, scale: 2 }).notNull(),
  // ── Payment ──
  paymentStatus: paymentStatusEnum("payment_status").default("unpaid").notNull(),
  paymentMethod: paymentMethodEnum("payment_method"),
  amountPaid:    numeric("amount_paid",  { precision: 10, scale: 2 }),
  changeGiven:   numeric("change_given", { precision: 10, scale: 2 }),
  paidAt:        timestamp("paid_at"),
  // ── Order status ──
  status:          orderStatusEnum("status").default("pending").notNull(),
  notes:           text("notes"),
  estimatedDoneAt: timestamp("estimated_done_at"),
  createdAt:       timestamp("created_at").defaultNow().notNull(),
  updatedAt:       timestamp("updated_at").defaultNow().notNull(),
});

// ─── Cash Register ────────────────────────────────────────────────────────────
export const cashRegister = pgTable("cash_register", {
  id:            serial("id").primaryKey(),
  balance:       numeric("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  lastUpdatedAt: timestamp("last_updated_at").defaultNow().notNull(),
  notes:         text("notes"),
});

// ─── Cash Register Transactions ───────────────────────────────────────────────
export const cashRegisterTransactions = pgTable("cash_register_transactions", {
  id:           serial("id").primaryKey(),
  // positive = money in, negative = money out (change given)
  amount:       numeric("amount",        { precision: 12, scale: 2 }).notNull(),
  type:         text("type").notNull(),  // "payment_in" | "change_out" | "manual_adjustment" | "initial"
  orderId:      integer("order_id").references(() => orders.id),
  description:  text("description").notNull(),
  balanceAfter: numeric("balance_after", { precision: 12, scale: 2 }).notNull(),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
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

export const cashRegisterTransactionsRelations = relations(
  cashRegisterTransactions,
  ({ one }) => ({
    order: one(orders, {
      fields: [cashRegisterTransactions.orderId],
      references: [orders.id],
    }),
  })
);

// ─── Exported Types ───────────────────────────────────────────────────────────

// The canonical role union type — use this everywhere instead of plain string
export type UserRole = typeof userRoleEnum.enumValues[number]; // "admin" | "employee" | "user"
export type Role     = typeof roles.$inferSelect;

export type User               = typeof users.$inferSelect;
export type NewUser            = typeof users.$inferInsert;
export type Customer           = typeof customers.$inferSelect;
export type NewCustomer        = typeof customers.$inferInsert;
export type Soap               = typeof soaps.$inferSelect;
export type NewSoap            = typeof soaps.$inferInsert;
export type Pewangi            = typeof pewangi.$inferSelect;
export type NewPewangi         = typeof pewangi.$inferInsert;
export type ServicePricing     = typeof servicePricing.$inferSelect;
export type NewServicePricing  = typeof servicePricing.$inferInsert;
export type Order              = typeof orders.$inferSelect;
export type NewOrder           = typeof orders.$inferInsert;
export type CashRegister            = typeof cashRegister.$inferSelect;
export type CashRegisterTransaction = typeof cashRegisterTransactions.$inferSelect;