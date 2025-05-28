'use server';

import { revalidatePath } from 'next/cache';

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

export async function getServices(): Promise<CleaningService[]> {
  try {
    const results = await db
      .select()
      .from(cleaningServices)
      .orderBy(desc(cleaningServices.serviceDate));

    return results.map((record) => ({
      ...record,
      serviceDate: new Date(record.serviceDate),
      hoursWorked: Number(record.hoursWorked),
      totalAmount: Number(record.totalAmount),
    }));
  } catch (error) {
    console.error('Error fetching services:', error);
    throw new Error('Failed to fetch services');
  }
}

export async function getProperties(): Promise<Property[]> {
  const results = await db.select().from(properties);
  return results.map((record) => ({
    ...record,
    regularRate: Number(record.regularRate),
    refreshRate: Number(record.refreshRate),
    rateType: record.rateType as RateType,
    taxStatus: record.taxStatus as TaxStatus,
  }));
}

// Mantener compatibilidad con la interfaz anterior
export async function getTransactions() {
  return [];
}

export async function updateRecords() {
  return { success: true };
}

export async function createRecord() {
  return { success: true };
}

export async function deleteRecords() {
  return { success: true };
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
