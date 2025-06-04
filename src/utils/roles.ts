import { auth } from '@clerk/nextjs/server';

import type { Roles } from '~/types/globals';

export const checkRole = async (role: Roles) => {
  const { sessionClaims } = await auth();
  return sessionClaims?.metadata.role === role;
};

export const getEmployeeId = async () => {
  const { sessionClaims } = await auth();
  return sessionClaims?.metadata.employeeId;
};

export const isAdmin = async () => await checkRole('admin');
