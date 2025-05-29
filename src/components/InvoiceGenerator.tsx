import { useMemo } from 'react';

import { type CleaningService, type Property } from '~/types';

interface InvoiceGeneratorProps {
  services: CleaningService[];
  property: Property;
  startDate: Date;
  endDate: Date;
}

export default function InvoiceGenerator({
  services,
  property,
  startDate,
  endDate,
}: InvoiceGeneratorProps) {
  const filteredServices = useMemo(() => {
    return services.filter(
      (service) =>
        service.propertyId === property.id &&
        service.serviceDate >= startDate &&
        service.serviceDate <= endDate
    );
  }, [services, property.id, startDate, endDate]);

  const totals = useMemo(() => {
    return filteredServices.reduce(
      (acc, service) => ({
        hours: acc.hours + service.hoursWorked,
        amount: acc.amount + service.totalAmount,
      }),
      { hours: 0, amount: 0 }
    );
  }, [filteredServices]);

  return (
    <div className="mt-4 rounded-lg border p-4">
      <h3 className="mb-2 text-lg font-bold">
        Factura: {property.name} - {property.clientName}
      </h3>
      <table className="w-full">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Horas</th>
            <th>Monto</th>
          </tr>
        </thead>
        <tbody>
          {filteredServices.map((service) => (
            <tr key={service.id}>
              <td>{service.serviceDate.toLocaleDateString()}</td>
              <td>{service.hoursWorked}</td>
              <td>${service.totalAmount}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td>Total</td>
            <td>{totals.hours}</td>
            <td>${totals.amount}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
