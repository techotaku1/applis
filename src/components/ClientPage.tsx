'use client';

import { useState, useEffect } from 'react';

import {
  getServices,
  updateServices,
  getProperties,
  getEmployees,
} from '~/server/actions/tableGeneral';

import EmployeeHoursTable from './EmployeeHoursTable';
import TransactionTable from './TransactionTable';

import type { CleaningService, Property, Employee } from '~/types';

type TableView = 'services' | 'hours';

export default function ClientPage() {
  const [currentView, setCurrentView] = useState<TableView>('services');
  const [data, setData] = useState({
    services: [] as CleaningService[],
    properties: [] as Property[],
    employees: [] as Employee[],
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [services, properties, employees] = await Promise.all([
          getServices(),
          getProperties(),
          getEmployees(),
        ]);
        setData({ services, properties, employees });
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    void loadData();
  }, []);

  return (
    <main className="container mx-auto h-screen p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold tracking-tight text-black">
          Control de Servicios
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
            Resumen de Horas
          </button>
        </div>
      </div>

      {currentView === 'services' ? (
        <TransactionTable
          initialData={data.services}
          onUpdateRecordAction={updateServices}
        />
      ) : (
        <EmployeeHoursTable
          services={data.services}
          properties={data.properties}
          employees={data.employees}
        />
      )}
    </main>
  );
}
