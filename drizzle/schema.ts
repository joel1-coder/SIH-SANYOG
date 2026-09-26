import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  department: varchar("department", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const sanyogRequests = mysqlTable("sanyog_requests", {
  id: int("id").autoincrement().primaryKey(),
  trackingId: varchar("trackingId", { length: 32 }).notNull().unique(),
  citizenMasterId: varchar("citizenMasterId", { length: 128 }).notNull(),
  citizenName: varchar("citizenName", { length: 160 }).notNull(),
  requestType: varchar("requestType", { length: 120 }).notNull(),
  description: text("description").notNull(),
  location: json("location").notNull(),
  attachments: json("attachments").notNull(),
  departments: json("departments").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  priority: mysqlEnum("priority", ["Low", "Medium", "High"]).default("Medium").notNull(),
  duplicateFlag: int("duplicateFlag").default(0).notNull(),
  statusPerDepartment: json("statusPerDepartment").notNull(),
  overallStatus: varchar("overallStatus", { length: 40 }).notNull(),
  slaDueAt: timestamp("slaDueAt").notNull(),
});

export const routingRules = mysqlTable("routing_rules", {
  id: int("id").autoincrement().primaryKey(),
  requestType: varchar("requestType", { length: 120 }).notNull(),
  departments: json("departments").notNull(),
  active: int("active").default(1).notNull(),
});

export const connectorRegistry = mysqlTable("connector_registry", {
  id: int("id").autoincrement().primaryKey(),
  department: varchar("department", { length: 120 }).notNull().unique(),
  status: varchar("status", { length: 20 }).notNull(),
  lastHeartbeat: timestamp("lastHeartbeat").defaultNow().notNull(),
});

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  action: varchar("action", { length: 160 }).notNull(),
  user: varchar("user", { length: 160 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: text("metadata").notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
