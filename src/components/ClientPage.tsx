'use client';

import { useState } from 'react';

import { useUser } from '@clerk/nextjs';

import { useServices, useProperties, useEmployees } from '~/hooks/useAppData';
import { updateServices } from '~/server/actions/tableGeneral';

import EmployeeHoursTable from './EmployeeHoursTable';
import InvoiceModal from './InvoiceModal';
import Loading from './Loading';
import PropertyHoursTable from './PropertyHoursTable';
import TransactionTable from './TransactionTable';

type TableView = 'services' | 'hours' | 'property-hours';

export default function ClientPage() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === 'admin';
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
      <div className="relative z-10 mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 sm:gap-4">
          <button
            onClick={() => setCurrentView('services')}
            className={`flex-1 rounded px-3 py-1.5 text-sm transition-colors duration-200 sm:flex-none sm:px-4 sm:py-2 sm:text-base ${
              currentView === 'services'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <span className="sm:hidden">Servicios</span>
            <span className="hidden sm:inline">Tabla de Servicios</span>
          </button>
          <button
            onClick={() => setCurrentView('hours')}
            className={`flex-1 rounded px-3 py-1.5 text-sm transition-colors duration-200 sm:flex-none sm:px-4 sm:py-2 sm:text-base ${
              currentView === 'hours'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <span className="sm:hidden">Empleados</span>
            <span className="hidden sm:inline">Resumen por Empleado</span>
          </button>
          <button
            onClick={() => setCurrentView('property-hours')}
            className={`flex-1 rounded px-3 py-1.5 text-sm transition-colors duration-200 sm:flex-none sm:px-4 sm:py-2 sm:text-base ${
              currentView === 'property-hours'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <span className="sm:hidden">Propiedades</span>
            <span className="hidden sm:inline">Resumen por Propiedad</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="flex-1 rounded bg-blue-500 px-3 py-1.5 text-sm text-white transition-colors duration-200 hover:bg-blue-600 sm:flex-none sm:px-4 sm:py-2 sm:text-base"
            >
              <span className="sm:hidden">Factura</span>
              <span className="hidden sm:inline">Generar Factura</span>
            </button>
          )}
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
