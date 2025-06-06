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
    <main className="container mx-auto min-h-screen max-w-full p-2 sm:p-4">
      <div className="relative z-10 mb-4">
        {/* Contenedor principal de botones */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-4">
          {/* Botones principales en grid de 2 columnas en móvil */}
          <button
            onClick={() => setCurrentView('services')}
            className={`rounded px-2 py-2 text-xs transition-colors duration-200 sm:px-4 sm:py-2 sm:text-base ${
              currentView === 'services'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <span>Tabla de Servicios</span>
          </button>
          <button
            onClick={() => setCurrentView('hours')}
            className={`rounded px-2 py-2 text-xs transition-colors duration-200 sm:px-4 sm:py-2 sm:text-base ${
              currentView === 'hours'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <span>Resumen por Empleado</span>
          </button>
          <button
            onClick={() => setCurrentView('property-hours')}
            className={`rounded px-2 py-2 text-xs transition-colors duration-200 sm:px-4 sm:py-2 sm:text-base ${
              currentView === 'property-hours'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <span>Resumen por Propiedad</span>
          </button>
          {/* Botón de factura en su propia fila en móvil */}
          {isAdmin && (
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="col-span-2 mt-2 rounded bg-blue-500 px-2 py-2 text-xs text-white transition-colors duration-200 hover:bg-blue-600 sm:col-span-1 sm:mt-0 sm:px-4 sm:py-2 sm:text-base"
            >
              <span>Generar Factura</span>
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
