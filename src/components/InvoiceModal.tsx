'use client';

import { useState, useMemo } from 'react';

import { PDFDownloadLink } from '@react-pdf/renderer';

import { formatRateType } from '~/utils/formatters';

import { InvoicePDF } from './InvoicePDF';
import TaxSelectionModal from './TaxSelectionModal';

import type { CleaningService, Property } from '~/types';

interface InvoiceModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
  services: CleaningService[];
  properties: Property[];
}

export default function InvoiceModal({
  isOpen,
  onCloseAction,
  services,
  properties,
}: InvoiceModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [withTax, setWithTax] = useState(false);
  const [showDownload, setShowDownload] = useState(false);

  // Remove unused fee states
  const [generalLaundryFee, setGeneralLaundryFee] = useState(0);
  const [generalRefreshFee, setGeneralRefreshFee] = useState(0);
  const [generalOtherFee, setGeneralOtherFee] = useState(0);

  const calculateTotals = () => {
    if (!selectedPropertyId || !startDate || !endDate) return null;

    const property = properties.find((p) => p.id === selectedPropertyId);
    if (!property) return null;

    const currencySymbol = property.rateType.includes('USD') ? '$' : 'FL';

    // Convert input dates to UTC midnight
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);

    const filteredServices = services.filter((service) => {
      // Convert service date to Date object if it isn't already
      const serviceDate =
        service.serviceDate instanceof Date
          ? service.serviceDate
          : new Date(service.serviceDate);

      // Set time to UTC midnight for comparison
      const compareDate = new Date(serviceDate);
      compareDate.setUTCHours(0, 0, 0, 0);

      return (
        service.propertyId === selectedPropertyId &&
        compareDate >= start &&
        compareDate <= end
      );
    });

    const totalHours = filteredServices.reduce(
      (sum, service) =>
        sum +
        (typeof service.hoursWorked === 'number' ? service.hoursWorked : 0),
      0
    );

    // Calculate total by summing individual service amounts
    const totalAmount = filteredServices.reduce((sum, service) => {
      let serviceAmount = 0;

      if (service.isRefreshService) {
        serviceAmount = property.refreshRate;
      } else if (property.rateType.includes('HOURLY')) {
        // Usar el nuevo cálculo exacto
        serviceAmount = calculateExactAmount(
          service.hoursWorked,
          property.regularRate
        );
      } else {
        serviceAmount = property.regularRate;
      }

      return sum + serviceAmount;
    }, 0);

    return {
      services: filteredServices,
      totalHours,
      totalAmount,
      rateType: property.rateType,
      rate: property.regularRate,
      property,
      currencySymbol,
    };
  };

  const totals = calculateTotals();

  const handleTaxConfirm = (includeTax: boolean) => {
    setWithTax(includeTax);
    setShowTaxModal(false);
    setShowDownload(true);
  };

  const grandTotal = useMemo(() => {
    if (!totals) return 0;

    const servicesTotal = totals.services.reduce((sum, service) => {
      const serviceAmount = service.isRefreshService
        ? totals.property.refreshRate
        : totals.property.rateType.includes('HOURLY')
          ? calculateExactAmount(
              service.hoursWorked,
              totals.property.regularRate
            )
          : totals.property.regularRate;

      // Remove unused fee calculations since we're not using them anymore
      return sum + serviceAmount;
    }, 0);

    return (
      servicesTotal + generalLaundryFee + generalRefreshFee + generalOtherFee
    );
  }, [totals, generalLaundryFee, generalRefreshFee, generalOtherFee]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[50] flex items-center justify-center overflow-y-auto bg-black/50 p-4">
        <div className="relative w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
          <div className="max-h-[80vh] overflow-y-auto">
            <h2 className="mb-4 text-xl font-bold">Generar Factura</h2>

            <div className="mb-4 grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full rounded border p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Fecha Fin</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 w-full rounded border p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Propiedad</label>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="mt-1 w-full rounded border p-2"
                >
                  <option value="">Seleccionar propiedad...</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name} - {property.clientName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {totals && (
              <div className="rounded-lg border p-4">
                {/* Resumen de Facturación section */}
                <div className="mb-4">
                  <h3 className="mb-2 font-bold">Resumen de Facturación</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Tipo de Tarifa:</p>
                      <p className="font-medium">
                        {formatRateType(totals.rateType, totals.rate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Horas:</p>
                      <p className="font-medium">
                        {formatHoursAndMinutes(totals.totalHours)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Servicios:</p>
                      <p className="font-medium">{totals.services.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total a Facturar:</p>
                      <p className="text-lg font-bold">
                        {totals.rateType.includes('USD') ? '$' : 'FL'}{' '}
                        {totals.totalAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Desglose de Servicios section - reduce max height */}
                <div className="mt-4 border-t pt-4">
                  <h4 className="mb-2 font-medium">Desglose de Servicios:</h4>
                  <div className="max-h-32 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left">
                          <th>Fecha</th>
                          <th>Horas</th>
                          <th>Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {totals.services.map((service) => {
                          const serviceAmount = service.isRefreshService
                            ? totals.property.refreshRate
                            : totals.property.rateType.includes('HOURLY')
                              ? calculateExactAmount(
                                  service.hoursWorked,
                                  totals.property.regularRate
                                )
                              : totals.property.regularRate;

                          const currencySymbol = totals.rateType.includes('USD')
                            ? '$'
                            : 'FL';

                          return (
                            <tr key={service.id}>
                              <td>
                                {new Date(
                                  service.serviceDate
                                ).toLocaleDateString()}
                              </td>
                              <td>
                                {formatHoursAndMinutes(service.hoursWorked)}
                              </td>
                              <td>
                                {currencySymbol} {serviceAmount.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Cargos Adicionales section */}
                <div className="mt-4 border-t pt-4">
                  <h4 className="mb-2 font-medium">Cargos Adicionales:</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col">
                      <label className="mb-1 text-sm text-gray-600">
                        Lavandería General:
                      </label>
                      <div className="flex items-center">
                        <span className="mr-1">
                          {totals.rateType.includes('USD') ? '$' : 'FL'}
                        </span>
                        <input
                          type="number"
                          value={generalLaundryFee || ''}
                          onChange={(e) =>
                            setGeneralLaundryFee(Number(e.target.value))
                          }
                          className="w-full rounded border px-2 py-1"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <label className="mb-1 text-sm text-gray-600">
                        Refresh General:
                      </label>
                      <div className="flex items-center">
                        <span className="mr-1">
                          {totals.rateType.includes('USD') ? '$' : 'FL'}
                        </span>
                        <input
                          type="number"
                          value={generalRefreshFee || ''}
                          onChange={(e) =>
                            setGeneralRefreshFee(Number(e.target.value))
                          }
                          className="w-full rounded border px-2 py-1"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <label className="mb-1 text-sm text-gray-600">
                        Otros Gastos:
                      </label>
                      <div className="flex items-center">
                        <span className="mr-1">
                          {totals.rateType.includes('USD') ? '$' : 'FL'}
                        </span>
                        <input
                          type="number"
                          value={generalOtherFee || ''}
                          onChange={(e) =>
                            setGeneralOtherFee(Number(e.target.value))
                          }
                          className="w-full rounded border px-2 py-1"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer section */}
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    {showDownload && totals && (
                      <PDFDownloadLink
                        document={
                          <InvoicePDF
                            services={totals.services}
                            property={totals.property}
                            startDate={new Date(startDate)}
                            endDate={new Date(endDate)}
                            withTax={withTax}
                            generalFees={{
                              laundryFee: generalLaundryFee,
                              refreshFee: generalRefreshFee,
                              otherFee: generalOtherFee,
                            }}
                          />
                        }
                        fileName={`invoice-${totals.property.name}-${startDate}.pdf`}
                        className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                      >
                        {({ loading }) =>
                          loading ? 'Generando...' : 'Descargar Factura'
                        }
                      </PDFDownloadLink>
                    )}
                    {!showDownload && (
                      <button
                        onClick={() => setShowTaxModal(true)}
                        className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                      >
                        Generar Factura
                      </button>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="mb-1 text-sm text-gray-600">
                      Subtotal servicios: {totals.currencySymbol}{' '}
                      {totals?.totalAmount.toFixed(2)}
                    </div>
                    {(generalLaundryFee > 0 ||
                      generalRefreshFee > 0 ||
                      generalOtherFee > 0) && (
                      <div className="mb-1 text-sm text-gray-600">
                        Cargos adicionales: {totals.currencySymbol}{' '}
                        {(
                          generalLaundryFee +
                          generalRefreshFee +
                          generalOtherFee
                        ).toFixed(2)}
                      </div>
                    )}
                    <p className="text-lg font-bold">
                      Total: {totals.currencySymbol} {grandTotal.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onCloseAction}
            className="mt-4 rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
          >
            Cerrar
          </button>
        </div>
      </div>

      <TaxSelectionModal
        isOpen={showTaxModal}
        onCloseAction={() => {
          setShowTaxModal(false);
          setShowDownload(true);
        }}
        onConfirmAction={handleTaxConfirm}
      />
    </>
  );
}

function formatHoursAndMinutes(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h ${minutes.toString().padStart(2, '0')}m`;
}

function calculateExactAmount(hours: number, rate: number): number {
  // Convertir las horas decimales a horas y minutos exactos
  const wholeHours = Math.floor(hours);
  const minutes = (hours - wholeHours) * 60;

  // Calcular el monto por las horas completas
  const hourlyAmount = wholeHours * rate;

  // Calcular el monto por los minutos (regla de tres)
  const minuteRate = rate / 60; // Tarifa por minuto
  const minuteAmount = minutes * minuteRate;

  return hourlyAmount + minuteAmount;
}
