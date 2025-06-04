'use client';

import { useState, useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { useUser } from '@clerk/nextjs';

import { getEmployees } from '~/server/actions/tableGeneral';

import type { Employee } from '~/types';

export default function LinkEmployeePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    void getEmployees().then(setEmployees);
  }, []);

  const handleSelectEmployee = async (employee: Employee) => {
    try {
      // Verificar si el nombre coincide
      if (user?.firstName?.toLowerCase() === employee.firstName.toLowerCase()) {
        // Actualizar metadata de Clerk
        await user.update({
          unsafeMetadata: {
            employeeId: employee.id,
            role: 'employee',
          },
        });

        // Vincular en la base de datos
        await fetch('/api/employees/link-clerk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId: employee.id }),
        });

        router.push('/');
      } else {
        alert('Por favor selecciona el empleado que coincida con tu nombre');
      }
    } catch (error) {
      console.error('Error linking employee:', error);
      alert('Error al vincular empleado');
    }
  };

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-2xl font-bold">Confirma tu Identidad</h1>
        <p className="mb-4 text-gray-600">
          Selecciona tu nombre de la lista para vincular tu cuenta:
        </p>
        <div className="space-y-2">
          {employees
            .filter(
              (emp) =>
                emp.firstName.toLowerCase() === user?.firstName?.toLowerCase()
            )
            .map((employee) => (
              <button
                key={employee.id}
                onClick={() => handleSelectEmployee(employee)}
                className="w-full rounded border p-4 text-left hover:bg-gray-50"
              >
                {employee.firstName} {employee.lastName}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
