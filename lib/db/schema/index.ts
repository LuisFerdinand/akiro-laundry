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
export const userRoleEnum = pgEnum("user_role", ["admin", "employee", "user"]);

export const roles = pgTable("roles", {
  id:          serial("id").primaryKey(),
  name:        userRoleEnum("name").notNull().unique(),
  description: text("description").notNull(),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
});

// ─── Users ────────────────────────────────────────────────────────────────────
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
// Top-level order record. Service details live in `order_items`.
// Legacy single-service columns (servicePricingId, weightKg, basePricePerKg,
// soapCost, pewangiCost) are REMOVED — everything is now in order_items.
export const orders = pgTable("orders", {
  id:          serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerId:  integer("customer_id").references(() => customers.id).notNull(),

  // ── Totals (sum of all items) ──
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),

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

// ─── Order Items ──────────────────────────────────────────────────────────────
// One row per service line within an order.
// • Clothes service  → pricingUnit = "per_kg",  weightKg = X, quantity = null
// • Shoes service    → pricingUnit = "per_pcs", weightKg = null, quantity = N
// Both can coexist in the same order.
export const orderItems = pgTable("order_items", {
  id:               serial("id").primaryKey(),
  orderId:          integer("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  servicePricingId: integer("service_pricing_id").references(() => servicePricing.id).notNull(),

  // ── Quantity fields — only one will be set depending on pricingUnit ──
  weightKg: numeric("weight_kg", { precision: 6, scale: 2 }),   // set when pricingUnit = "per_kg"
  quantity: integer("quantity"),                                  // set when pricingUnit = "per_pcs"

  // ── Add-ons (per-item so shoes can skip soap/pewangi) ──
  soapId:    integer("soap_id").references(() => soaps.id),
  pewangiId: integer("pewangi_id").references(() => pewangi.id),

  // ── Snapshotted prices at time of order ──
  basePricePerKg: numeric("base_price_per_kg", { precision: 10, scale: 2 }).notNull(),
  soapCost:       numeric("soap_cost",    { precision: 10, scale: 2 }).default("0"),
  pewangiCost:    numeric("pewangi_cost", { precision: 10, scale: 2 }).default("0"),
  subtotal:       numeric("subtotal",     { precision: 10, scale: 2 }).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields:     [orders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields:     [orderItems.orderId],
    references: [orders.id],
  }),
  servicePricing: one(servicePricing, {
    fields:     [orderItems.servicePricingId],
    references: [servicePricing.id],
  }),
  soap: one(soaps, {
    fields:     [orderItems.soapId],
    references: [soaps.id],
  }),
  pewangi: one(pewangi, {
    fields:     [orderItems.pewangiId],
    references: [pewangi.id],
  }),
}));

export const cashRegisterTransactionsRelations = relations(
  cashRegisterTransactions,
  ({ one }) => ({
    order: one(orders, {
      fields:     [cashRegisterTransactions.orderId],
      references: [orders.id],
    }),
  }),
);

// ─── Exported Types ───────────────────────────────────────────────────────────
export type UserRole = typeof userRoleEnum.enumValues[number];
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
export type OrderItem          = typeof orderItems.$inferSelect;
export type NewOrderItem       = typeof orderItems.$inferInsert;
export type CashRegister            = typeof cashRegister.$inferSelect;
export type CashRegisterTransaction = typeof cashRegisterTransactions.$inferSelect;