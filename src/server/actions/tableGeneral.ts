'use server';

import { revalidatePath } from 'next/cache';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { eq, desc, inArray } from 'drizzle-orm';

import { db } from '~/server/db';
import { cleaningServices, properties, employees } from '~/server/db/schema';

import type {
  CleaningService,
  Property,
  Employee,
  RateType,
  TaxStatus,
} from '~/types';

class DatabaseError extends Error {
  constructor(
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

async function withRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export async function getServices(): Promise<CleaningService[]> {
  try {
    const { userId } = await auth();
    let isAdmin = false;
    let employeeId: string | undefined;

    if (userId) {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      isAdmin = user.publicMetadata?.role === 'admin';
      employeeId = user.publicMetadata?.employeeId as string | undefined;
    }

    const query = db
      .select()
      .from(cleaningServices)
      .orderBy(desc(cleaningServices.serviceDate));

    // Si no es admin, filtrar solo los servicios del empleado
    if (!isAdmin && employeeId) {
      query.where(eq(cleaningServices.employeeId, employeeId));
    }

    const results = await withRetry(() => query);

    return results.map((record) => ({
      ...record,
      serviceDate: new Date(record.serviceDate),
      hoursWorked: Number(record.hoursWorked),
      totalAmount: Number(record.totalAmount),
      laundryFee: Number(record.laundryFee),
      refreshFee: Number(record.refreshFee),
    }));
  } catch (error) {
    console.error('Error fetching services:', error);
    if (error instanceof Error) {
      throw new DatabaseError(
        `Database operation failed: ${error.message}`,
        error
      );
    }
    throw new DatabaseError(
      'An unexpected error occurred while fetching services'
    );
  }
}

export async function getProperties(): Promise<Property[]> {
  try {
    const results = await withRetry(() => db.select().from(properties));
    return results.map((record) => ({
      ...record,
      regularRate: Number(record.regularRate),
      refreshRate: Number(record.refreshRate),
      rateType: record.rateType as RateType,
      taxStatus: record.taxStatus as TaxStatus,
    }));
  } catch (error) {
    console.error('Error fetching properties:', error);
    throw new DatabaseError('Failed to fetch properties', error);
  }
}

// Mantener compatibilidad con la interfaz anterior
export async function getTransactions(): Promise<[]> {
  return Promise.resolve([]);
}

export async function updateRecords(): Promise<{ success: boolean }> {
  return Promise.resolve({ success: true });
}

export async function createRecord(): Promise<{ success: boolean }> {
  return Promise.resolve({ success: true });
}

export async function deleteRecords(): Promise<{ success: boolean }> {
  return Promise.resolve({ success: true });
}

export async function getEmployees(): Promise<Employee[]> {
  return await db.select().from(employees);
}

export async function createService(
  service: CleaningService
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.insert(cleaningServices).values({
      ...service,
      hoursWorked: service.hoursWorked.toString(),
      totalAmount: service.totalAmount.toString(),
      laundryFee: service.laundryFee.toString(),
      refreshFee: service.refreshFee.toString(),
    });
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error creating service:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create service',
    };
  }
}

export async function updateServices(
  services: CleaningService[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await Promise.all(
      services.map(async (service) => {
        await db
          .update(cleaningServices)
          .set({
            ...service,
            hoursWorked: service.hoursWorked.toString(),
            totalAmount: service.totalAmount.toString(),
            laundryFee: service.laundryFee.toString(),
            refreshFee: service.refreshFee.toString(),
            updatedAt: new Date(),
          })
          .where(eq(cleaningServices.id, service.id));
      })
    );
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error updating services:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update services',
    };
  }
}

export async function deleteServices(
  ids: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(cleaningServices).where(inArray(cleaningServices.id, ids));
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting services:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete services',
    };
  }
}
