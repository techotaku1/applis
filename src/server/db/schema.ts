import {
  pgTable,
  varchar,
  boolean,
  timestamp,
  decimal,
  pgEnum,
} from 'drizzle-orm/pg-core';

// Enums
export const rateTypeEnum = pgEnum('rate_type', [
  'HOURLY_USD',
  'HOURLY_FL',
  'DAILY_USD',
  'DAILY_FL',
  'PER_APT_FL',
]);

export const taxStatusEnum = pgEnum('tax_status', ['WITH_TAX', 'WITHOUT_TAX']);

// Properties table
export const properties = pgTable('properties', {
  id: varchar('id').primaryKey(),
  name: varchar('name').notNull(),
  clientName: varchar('client_name').notNull(),
  regularRate: decimal('regular_rate', { precision: 10, scale: 2 }).notNull(),
  rateType: rateTypeEnum('rate_type').notNull(),
  refreshRate: decimal('refresh_rate', { precision: 10, scale: 2 }).notNull(),
  standardHours: varchar('standard_hours').notNull(),
  taxStatus: taxStatusEnum('tax_status').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Employees table
export const employees = pgTable('employees', {
  id: varchar('id').primaryKey(),
  firstName: varchar('first_name').notNull(),
  lastName: varchar('last_name').notNull(),
  active: boolean('active').default(true).notNull(),
  startDate: timestamp('start_date').notNull(),
  phone: varchar('phone'),
  email: varchar('email'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  clerkId: varchar('clerk_id').unique(), // Add this line
  role: varchar('role').default('employee').notNull(), // Agregar campo role
});

// Cleaning Services table
export const cleaningServices = pgTable('cleaning_services', {
  id: varchar('id').primaryKey(),
  propertyId: varchar('property_id')
    .references(() => properties.id)
    .notNull(),
  employeeId: varchar('employee_id')
    .references(() => employees.id)
    .notNull(),
  serviceDate: timestamp('service_date').notNull(),
  workDate: timestamp('work_date').notNull(), // Nueva columna
  hoursWorked: decimal('hours_worked', { precision: 5, scale: 2 }).notNull(),
  isRefreshService: boolean('is_refresh_service').default(false).notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  laundryFee: decimal('laundry_fee', { precision: 10, scale: 2 })
    .default('0')
    .notNull(),
  refreshFee: decimal('refresh_fee', { precision: 10, scale: 2 })
    .default('0')
    .notNull(),
  notes: varchar('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Create a helper type for employee with clerk data
export type EmployeeWithClerk = typeof employees.$inferSelect & {
  clerkId: string | null;
  role: 'admin' | 'employee';
};
