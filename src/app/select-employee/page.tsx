'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useUser } from '@clerk/nextjs';

import { getEmployees } from '~/server/actions/tableGeneral';

import type { Employee } from '~/types';

export default function SelectEmployeePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    void getEmployees().then(setEmployees);
  }, []);

  const handleSelectEmployee = async (employeeId: string) => {
    if (!user) return;

    try {
      await user.update({
        unsafeMetadata: {
          employeeId,
          role: 'employee',
        },
      });
      router.push('/');
    } catch (error) {
      console.error('Error updating user metadata:', error);
    }
  };

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-4 text-2xl font-bold">Selecciona tu perfil</h1>
        <div className="space-y-2">
          {employees.map((employee) => (
            <button
              key={employee.id}
              onClick={() => handleSelectEmployee(employee.id)}
              className="w-full rounded p-2 text-left hover:bg-gray-100"
            >
              {employee.firstName} {employee.lastName}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
