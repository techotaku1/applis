'use client';

import { useMemo } from 'react';

import { formatTotalHours } from '~/utils/formulas';

import type { CleaningService, Property } from '~/types';

interface PropertyHoursTableProps {
  services: CleaningService[];
  properties: Property[];
}

interface PropertySummary {
  propertyId: string;
  totalHours: number;
  daysWorked: Set<string>;
}

export default function PropertyHoursTable({
  services,
  properties,
}: PropertyHoursTableProps) {
  const summary = useMemo(() => {
    const summaryMap = new Map<string, PropertySummary>();

    services.forEach((service) => {
      const key = service.propertyId;
      const existingSummary = summaryMap.get(key) ?? {
        propertyId: key,
        totalHours: 0,
        daysWorked: new Set<string>(),
      };

      // Handle date safely with guaranteed string output
      const getServiceDateString = (
        date: Date | string | undefined
      ): string => {
        const now = new Date();
        const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        try {
          if (!date) return defaultDate;

          const parsedDate = date instanceof Date ? date : new Date(date);
          if (isNaN(parsedDate.getTime())) return defaultDate;

          const year = parsedDate.getFullYear();
          const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
          const day = String(parsedDate.getDate()).padStart(2, '0');

          return `${year}-${month}-${day}`;
        } catch {
          return defaultDate;
        }
      };

      const dateStr = getServiceDateString(service.serviceDate);
      const updatedDaysWorked = new Set(existingSummary.daysWorked);
      updatedDaysWorked.add(dateStr);

      summaryMap.set(key, {
        ...existingSummary,
        totalHours: existingSummary.totalHours + service.hoursWorked,
        daysWorked: updatedDaysWorked,
      });
    });

    return Array.from(summaryMap.values());
  }, [services]);

  return (
    <div className="rounded-lg bg-white p-4 shadow-md">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-gray-600">
            <th className="p-2">Propiedad</th>
            <th className="p-2">Cliente</th>
            <th className="p-2">Total Horas</th>
            <th className="p-2">Días Trabajados</th>
          </tr>
        </thead>
        <tbody>
          {summary.map((row) => {
            const property = properties.find((p) => p.id === row.propertyId);

            return (
              <tr key={row.propertyId} className="border-b">
                <td className="p-2">{property ? property.name : 'N/A'}</td>
                <td className="p-2">
                  {property ? property.clientName : 'N/A'}
                </td>
                <td className="p-2 font-medium">
                  {formatTotalHours(row.totalHours)}
                </td>
                <td className="p-2">{row.daysWorked.size}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
