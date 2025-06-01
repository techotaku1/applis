'use client';

import { useState, useEffect } from 'react';

import {
  getServices,
  updateServices,
  getProperties,
  getEmployees,
} from '~/server/actions/tableGeneral';

import EmployeeHoursTable from './EmployeeHoursTable';
import Loading from './Loading';
import PropertyHoursTable from './PropertyHoursTable';
import TransactionTable from './TransactionTable';

import type { CleaningService, Property, Employee } from '~/types';

type TableView = 'services' | 'hours' | 'property-hours';

export default function ClientPage() {
  const [currentView, setCurrentView] = useState<TableView>('services');
  const [services, setServices] = useState<CleaningService[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [servicesData, propertiesData, employeesData] = await Promise.all(
          [getServices(), getProperties(), getEmployees()]
        );
        setServices(servicesData);
        setProperties(propertiesData);
        setEmployees(employeesData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, []);

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
        </div>
      </div>

      {currentView === 'services' ? (
        <TransactionTable
          initialData={services}
          onUpdateRecordAction={updateServices}
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
    </main>
  );
}
