'use client';

import { useMemo } from 'react';

import { formatTotalHours } from '~/utils/formulas';

import type { CleaningService, Property, Employee } from '~/types';

interface EmployeeHoursTableProps {
  services: CleaningService[];
  properties: Property[];
  employees: Employee[];
}

interface HoursSummary {
  employeeId: string;
  propertyId: string;
  totalHours: number;
  daysWorked: number;
}

export default function EmployeeHoursTable({
  services,
  properties,
  employees,
}: EmployeeHoursTableProps) {
  const summary = useMemo(() => {
    const summaryMap = new Map<string, HoursSummary>();

    services.forEach((service) => {
      const key = `${service.employeeId}-${service.propertyId}`;
      const existingSummary = summaryMap.get(key) ?? {
        employeeId: service.employeeId,
        propertyId: service.propertyId,
        totalHours: 0,
        daysWorked: 0,
      };

      summaryMap.set(key, {
        ...existingSummary,
        totalHours: existingSummary.totalHours + service.hoursWorked,
        daysWorked: existingSummary.daysWorked + 1,
      });
    });

    return Array.from(summaryMap.values());
  }, [services]);

  return (
    <div className="rounded-lg bg-white p-4 shadow-md">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-gray-600">
            <th className="p-2">Empleado</th>
            <th className="p-2">Propiedad</th>
            <th className="p-2">Cliente</th>
            <th className="p-2">Total Horas</th>
            <th className="p-2">Días Trabajados</th>
          </tr>
        </thead>
        <tbody>
          {summary.map((row) => {
            const employee = employees.find((e) => e.id === row.employeeId);
            const property = properties.find((p) => p.id === row.propertyId);

            return (
              <tr
                key={`${row.employeeId}-${row.propertyId}`}
                className="border-b"
              >
                <td className="p-2">
                  {employee
                    ? `${employee.firstName} ${employee.lastName}`
                    : 'N/A'}
                </td>
                <td className="p-2">{property ? property.name : 'N/A'}</td>
                <td className="p-2">
                  {property ? property.clientName : 'N/A'}
                </td>
                <td className="p-2 font-medium">
                  {formatTotalHours(row.totalHours)}
                </td>
                <td className="p-2">{row.daysWorked}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
