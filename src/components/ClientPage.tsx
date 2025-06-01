'use client';

import { useState } from 'react';

import { useServices, useProperties, useEmployees } from '~/hooks/useAppData';
import { updateServices } from '~/server/actions/tableGeneral';

import EmployeeHoursTable from './EmployeeHoursTable';
import InvoiceModal from './InvoiceModal';
import Loading from './Loading';
import PropertyHoursTable from './PropertyHoursTable';
import TransactionTable from './TransactionTable';

type TableView = 'services' | 'hours' | 'property-hours';

export default function ClientPage() {
  const [currentView, setCurrentView] = useState<TableView>('services');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const {
    data: services = [],
    isLoading: servicesLoading,
    mutate: mutateServices,
  } = useServices();
  const { data: properties = [], isLoading: propertiesLoading } =
    useProperties();
  const { data: employees = [], isLoading: employeesLoading } = useEmployees();

  const isLoading = servicesLoading || propertiesLoading || employeesLoading;

  if (isLoading) {
    return <Loading />;
  }

  return (
    <main className="container mx-auto h-screen p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold tracking-tight text-black">
          Registro de Servicios
        </h1>
        <div className="flex gap-4">
          <button
            onClick={() => setCurrentView('services')}
            className={`rounded px-4 py-2 ${
              currentView === 'services'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Tabla de Servicios
          </button>
          <button
            onClick={() => setCurrentView('hours')}
            className={`rounded px-4 py-2 ${
              currentView === 'hours'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Resumen por Empleado
          </button>
          <button
            onClick={() => setCurrentView('property-hours')}
            className={`rounded px-4 py-2 ${
              currentView === 'property-hours'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Resumen por Propiedad
          </button>
          <button
            onClick={() => setShowInvoiceModal(true)}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Generar Factura
          </button>
        </div>
      </div>

      {currentView === 'services' ? (
        <TransactionTable
          initialData={services}
          onUpdateRecordAction={async (records) => {
            const result = await updateServices(records);
            if (result.success && mutateServices) {
              await mutateServices();
            }
            return result;
          }}
        />
      ) : currentView === 'hours' ? (
        <EmployeeHoursTable
          services={services}
          properties={properties}
          employees={employees}
        />
      ) : (
        <PropertyHoursTable services={services} properties={properties} />
      )}

      <InvoiceModal
        isOpen={showInvoiceModal}
        onCloseAction={() => setShowInvoiceModal(false)}
        services={services}
        properties={properties}
      />
    </main>
  );
}
