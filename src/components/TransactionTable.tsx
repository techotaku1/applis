'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

import { useDebouncedSave } from '~/hooks/useDebouncedSave';
import {
  createService,
  deleteServices,
  getProperties,
  getEmployees,
} from '~/server/actions/tableGeneral';
import {
  RATE_TYPES,
  type CleaningService,
  type SaveResult,
  type Property,
  type Employee,
} from '~/types';
import { formatRateType } from '~/utils/formatters';

import '~/styles/spinner.css';
import '~/styles/buttonLoader.css';
import '~/styles/deleteButton.css';
import HeaderTitles from './HeaderTitles';

type InputValue = string | number | boolean | Date | null;
type InputType = 'text' | 'number' | 'date' | 'checkbox';
type HandleInputChange = (
  id: string,
  field: keyof CleaningService,
  value: InputValue
) => void;

interface TransactionTableProps {
  initialData: CleaningService[];
  onUpdateRecordAction: (records: CleaningService[]) => Promise<SaveResult>;
}

function getCurrentColombiaDate(): Date {
  const now = new Date();
  const colombiaOptions = {
    timeZone: 'America/Bogota',
    year: 'numeric' as const,
    month: '2-digit' as const,
    day: '2-digit' as const,
    hour: '2-digit' as const,
    minute: '2-digit' as const,
    second: '2-digit' as const,
    hour12: false,
  };

  const colombiaDateStr = now.toLocaleString('en-US', colombiaOptions);
  return new Date(colombiaDateStr);
}

// Update the hours calculation function to preserve minutes
function calculateHoursBetweenDates(startDate: Date, endDate: Date): number {
  const diff = endDate.getTime() - startDate.getTime();
  const diffInMinutes = diff / (1000 * 60); // Get total minutes
  const hours = Math.floor(diffInMinutes / 60); // Get whole hours
  const minutes = diffInMinutes % 60; // Get remaining minutes
  return hours + minutes / 60; // Convert to decimal hours
}

// Update the formatting function to handle minutes better
function formatHoursAndMinutes(totalHours: number): string {
  const hours = Math.floor(totalHours);
  const decimalPart = totalHours - hours;
  const minutes = Math.round(decimalPart * 60);
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

function formatCurrentDate(date: Date): string {
  const colombiaDate = new Date(
    date.toLocaleString('en-US', { timeZone: 'America/Bogota' })
  );

  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Bogota',
  } as const;

  return new Intl.DateTimeFormat('es-CO', options)
    .format(colombiaDate)
    .toUpperCase();
}

interface PropertySelectProps {
  value: string;
  onChange: (propertyId: string, property: Property) => void;
  properties: Property[];
}

const PropertySelect = ({
  value,
  onChange,
  properties,
}: PropertySelectProps) => (
  <select
    value={value}
    onChange={(e) => {
      const property = properties.find((p) => p.id === e.target.value);
      if (property) {
        onChange(e.target.value, property);
      }
    }}
    className="table-select-field w-full"
  >
    <option value="">Seleccionar propiedad</option>
    {properties.map((property) => (
      <option key={property.id} value={property.id}>
        {property.name}
      </option>
    ))}
  </select>
);

interface EmployeeSelectProps {
  value: string;
  onChange: (employeeId: string) => void;
  employees: Employee[];
}

const EmployeeSelect = ({
  value,
  onChange,
  employees,
}: EmployeeSelectProps) => (
  <div className="relative w-full">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="table-select-field w-full"
    >
      <option value="" className="text-center">
        Seleccionar empleado
      </option>
      {employees.map((employee: Employee) => (
        <option key={employee.id} value={employee.id} className="text-center">
          {employee.firstName} {employee.lastName}
        </option>
      ))}
    </select>
  </div>
);

function calculateTotalAmount(
  property: Property,
  isRefresh: boolean,
  hours: number
) {
  if (isRefresh) {
    return property.refreshRate;
  }

  switch (property.rateType) {
    case RATE_TYPES.HOURLY_USD:
    case RATE_TYPES.HOURLY_FL:
      return property.regularRate * hours;
    case RATE_TYPES.DAILY_USD:
    case RATE_TYPES.DAILY_FL:
    case RATE_TYPES.PER_APT_FL:
      return property.regularRate;
    default:
      return 0;
  }
}

// Add these utility functions at the top of the file
function formatDateToLocalInput(date: Date): string {
  try {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return new Date().toISOString().slice(0, 16);
  }
}

function parseLocalDateToUTC(dateStr: string): Date {
  try {
    const localDate = new Date(dateStr);
    if (isNaN(localDate.getTime())) {
      throw new Error('Invalid date');
    }
    return localDate;
  } catch (error) {
    console.error('Error parsing date:', error);
    return new Date();
  }
}

export default function TransactionTable({
  initialData,
  onUpdateRecordAction,
}: TransactionTableProps): React.JSX.Element {
  const [data, setData] = useState<CleaningService[]>(initialData);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentDate, setCurrentDate] = useState(() =>
    formatCurrentDate(getCurrentColombiaDate())
  );
  const [isSaving, setIsSaving] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [rowsToDelete, setRowsToDelete] = useState<Set<string>>(new Set());
  const [properties, setProperties] = useState<Property[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isAddingRecord, setIsAddingRecord] = useState(false);

  // Cargar propiedades y empleados al montar el componente
  useEffect(() => {
    getProperties().then(setProperties).catch(console.error);
    getEmployees().then(setEmployees).catch(console.error);
  }, []);

  // Actualizar el efecto para mantener los datos sincronizados con initialData
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const addNewRow = async () => {
    try {
      // Use current Colombia time for both dates
      const colombiaDate = getCurrentColombiaDate();

      const results = await Promise.all([getProperties(), getEmployees()]);
      const firstProperty = results[0]?.[0];
      const firstEmployee = results[1]?.[0];

      if (!firstProperty || !firstEmployee) {
        throw new Error('No hay propiedades o empleados disponibles');
      }

      const newRow: CleaningService = {
        id: crypto.randomUUID(),
        propertyId: firstProperty.id,
        employeeId: firstEmployee.id,
        serviceDate: colombiaDate,
        workDate: colombiaDate,
        hoursWorked: 0,
        isRefreshService: false,
        totalAmount: calculateTotalAmount(firstProperty, false, 0),
        notes: null,
        createdAt: colombiaDate,
        updatedAt: colombiaDate,
      };

      const result = await createService(newRow);
      if (result.success) {
        setData((prevData) => [newRow, ...prevData]);
        await handleSaveOperation([newRow, ...data]);

        // Update current page to today's date
        const todayStr = colombiaDate.toISOString().split('T')[0];
        const pageIndex = groupedByDate.findIndex(
          ([date]) => date === todayStr
        );
        if (pageIndex !== -1) {
          setCurrentPage(pageIndex + 1);
        }
      } else {
        throw new Error(result.error ?? 'Error al crear el servicio');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error creating new service:', errorMessage);
      alert(`Error al crear el servicio: ${errorMessage}`);
    }
  };

  const handlePropertyChange = useCallback(
    (serviceId: string, propertyId: string, property: Property) => {
      setData((prevData) =>
        prevData.map((service) => {
          if (service.id === serviceId) {
            const newService = {
              ...service,
              propertyId,
            };
            const totalAmount = calculateTotalAmount(
              property,
              newService.isRefreshService,
              newService.hoursWorked
            );
            return {
              ...newService,
              totalAmount,
            };
          }
          return service;
        })
      );
    },
    [] // Removed calculateTotalAmount dependency
  );

  const handleSaveSuccess = useCallback(() => {
    setUnsavedChanges(false);
    setIsSaving(false);
  }, []);

  const debouncedSave = useDebouncedSave(
    onUpdateRecordAction,
    handleSaveSuccess,
    2000
  );

  // Actualizar la función para manejar CleaningService[]
  const handleSaveOperation = useCallback(
    async (records: CleaningService[]): Promise<SaveResult> => {
      try {
        setIsSaving(true);
        return await onUpdateRecordAction(records);
      } catch (error) {
        console.error('Error saving changes:', error);
        return { success: false, error: 'Failed to save changes' };
      } finally {
        setIsSaving(false);
      }
    },
    [onUpdateRecordAction]
  );

  // Actualizar groupedByDate para usar serviceDate en lugar de fecha
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, CleaningService[]>();

    data.forEach((record) => {
      if (
        !(record.serviceDate instanceof Date) ||
        isNaN(record.serviceDate.getTime())
      ) {
        return;
      }

      const dateKey = record.serviceDate.toISOString().split('T')[0] ?? '';
      if (!dateKey) return;

      const existingGroup = groups.get(dateKey) ?? [];
      groups.set(dateKey, [...existingGroup, record]);
    });

    // Ordenar por fecha de servicio
    for (const [key, records] of groups.entries()) {
      const sortedRecords = records.sort((a, b) => {
        return (
          new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime()
        );
      });
      groups.set(key, sortedRecords);
    }

    return Array.from(groups.entries()).sort(([dateA], [dateB]) =>
      dateB.localeCompare(dateA)
    );
  }, [data]);

  // Actualizar handleInputChange para los nuevos campos
  const handleInputChange: HandleInputChange = useCallback(
    (id, field, value) => {
      setData((prevData) => {
        const newData = prevData.map((row) => {
          if (row.id === id) {
            const updatedRow = { ...row };

            if (field === 'serviceDate' || field === 'workDate') {
              const newDate = value instanceof Date ? value : new Date();
              updatedRow[field] = newDate;

              // Actualizar hoursWorked cuando cambie cualquiera de las fechas
              if (updatedRow.serviceDate && updatedRow.workDate) {
                updatedRow.hoursWorked = calculateHoursBetweenDates(
                  updatedRow.serviceDate,
                  updatedRow.workDate
                );
              }
            } else {
              updatedRow[field] = value as never;
            }

            return updatedRow;
          }
          return row;
        });

        setUnsavedChanges(true);
        void debouncedSave(newData);
        return newData;
      });

      // Actualizar página cuando cambia la fecha de servicio
      if (field === 'serviceDate' && value instanceof Date) {
        const dateStr = value.toISOString().split('T')[0];
        const pageIndex = groupedByDate.findIndex(
          ([gDate]) => gDate === dateStr
        );
        if (pageIndex !== -1) {
          setCurrentPage(pageIndex + 1);
        }
      }
    },
    [debouncedSave, groupedByDate]
  );

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      const result = await onUpdateRecordAction(data);
      if (result.success) {
        setUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Error saving changes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getPropertyClientName = useCallback(
    (propertyId: string) => {
      const property = properties.find((p) => p.id === propertyId);
      return property?.clientName ?? '';
    },
    [properties]
  );

  // Modificar la función renderInput para mostrar el valor del servicio correctamente
  // Actualiza estas definiciones de tipos antes del renderInput
  type ServiceField = keyof CleaningService;
  type NumericFields = Extract<ServiceField, 'hoursWorked' | 'totalAmount'>;

  // Inside renderInput function, update the types and field checks
  const renderInput = useCallback(
    (row: CleaningService, field: ServiceField, _type: InputType = 'text') => {
      const value = row[field];

      // Fix the numeric field type checking
      const isNumericField = (name: ServiceField): name is NumericFields => {
        return ['hoursWorked', 'totalAmount'].includes(name);
      };

      const getWidth = () => {
        switch (field) {
          case 'serviceDate':
            return 'w-[140px]';
          case 'propertyId':
          case 'employeeId':
            return 'w-[100px]';
          case 'hoursWorked':
            return 'w-[70px]';
          case 'totalAmount':
            return 'w-[90px]';
          case 'notes':
            return 'w-[200px]';
          default:
            return 'w-[100px]';
        }
      };

      // Manejar fechas (tanto serviceDate como workDate)
      if (field === 'serviceDate' || field === 'workDate') {
        const dateValue = value instanceof Date ? value : new Date();

        return (
          <div className="relative flex w-full items-center justify-center">
            <input
              type="datetime-local"
              value={formatDateToLocalInput(dateValue)}
              onChange={(e) => {
                try {
                  const date = parseLocalDateToUTC(e.target.value);
                  handleInputChange(row.id, field, date);
                } catch (err) {
                  console.error('Error handling date input:', err);
                }
              }}
              className="table-date-field flex cursor-pointer items-center justify-center rounded border px-0 py-0.5 text-center text-[10px]"
            />
          </div>
        );
      }

      // For hoursWorked field, make it read-only since it's auto-calculated
      if (field === 'hoursWorked') {
        return (
          <div className="flex items-center justify-center">
            <span className="text-sm font-medium">
              {formatHoursAndMinutes(Number(value ?? 0))}
            </span>
          </div>
        );
      }

      // Modificar el renderizado del valor del servicio y tipo de pago
      if (field === 'totalAmount') {
        const property = properties.find((p) => p.id === row.propertyId);
        if (!property) return null;

        // Usar el formateador para mostrar el tipo de tarifa
        const formattedRate = formatRateType(
          property.rateType,
          property.regularRate
        );

        return (
          <div className="flex flex-col items-center justify-center px-2">
            <span className="text-sm font-medium">{formattedRate}</span>
          </div>
        );
      }

      // Modificar el renderizado del tiempo de servicio
      if (field === 'isRefreshService') {
        const property = properties.find((p) => p.id === row.propertyId);
        if (!property) return null;

        // Format the standardHours to always show "HORAS"
        const formattedHours = property.standardHours.includes('HORAS')
          ? property.standardHours
          : `${property.standardHours} HORAS`;

        return (
          <div className="flex items-center justify-center px-2">
            <span className="text-sm font-medium">{formattedHours}</span>
          </div>
        );
      }

      // Selección de propiedad
      if (field === 'propertyId') {
        return (
          <PropertySelect
            value={row.propertyId}
            onChange={(propertyId, property) =>
              handlePropertyChange(row.id, propertyId, property)
            }
            properties={properties}
          />
        );
      }

      // Select de empleados
      if (field === 'employeeId') {
        return (
          <EmployeeSelect
            value={row.employeeId}
            onChange={(employeeId) =>
              handleInputChange(row.id, 'employeeId', employeeId)
            }
            employees={employees}
          />
        );
      }

      // Input numérico para horas
      if (isNumericField(field)) {
        return (
          <div className="flex items-center justify-center">
            <span className="text-sm font-medium">
              {formatHoursAndMinutes(Number(value ?? 0))}
            </span>
          </div>
        );
      }

      // Campos numéricos y texto
      return (
        <input
          type={isNumericField(field) ? 'number' : 'text'}
          value={value?.toString() ?? ''}
          onChange={(e) => {
            const newValue = isNumericField(field)
              ? Number(e.target.value)
              : e.target.value;
            handleInputChange(row.id, field, newValue);
          }}
          className={`flex items-center justify-center overflow-hidden rounded border px-0.5 py-0.5 text-center text-[10px] ${getWidth()}`}
        />
      );
    },
    [handleInputChange, properties, employees, handlePropertyChange]
  );

  // Memoize the current date group and related data
  const { currentDateGroup, paginatedData, totalPages } = useMemo(() => {
    const defaultDate = new Date().toISOString().split('T')[0];
    const group = groupedByDate[currentPage - 1] ?? [defaultDate, []];

    return {
      currentDateGroup: group,
      paginatedData: group[1],
      totalPages: groupedByDate.length,
    };
  }, [groupedByDate, currentPage]);

  // Update current date when page changes with safe date handling
  useEffect(() => {
    const dateStr = currentDateGroup[0];
    if (!dateStr) return;

    try {
      const date = new Date(dateStr);
      const colombiaDate = new Date(
        date.toLocaleString('en-US', { timeZone: 'America/Bogota' })
      );

      setCurrentDate(formatCurrentDate(colombiaDate));
    } catch (error) {
      console.error('Error formatting date:', error);
    }
  }, [currentDateGroup]);

  // Add pagination controls component
  const Pagination = () => (
    <div className="mt-4 flex justify-center gap-2">
      <button
        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        className="rounded px-4 py-2 text-sm font-medium text-black hover:bg-white/10 disabled:opacity-50"
      >
        Anterior
      </button>
      <span className="flex items-center px-4 text-sm text-black">
        Página {currentPage} de {totalPages}
      </span>
      <button
        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
        className="rounded px-4 py-2 text-sm font-medium text-black hover:bg-white/10 disabled:opacity-50"
      >
        Siguiente
      </button>
    </div>
  );

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const newZoom = Math.max(prev - 0.1, 0.5);
      return newZoom;
    });
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => {
      const newZoom = Math.min(prev + 0.1, 1);
      return newZoom;
    });
  }, []);

  const handleDeleteModeToggle = () => {
    setIsDeleteMode(!isDeleteMode);
    setRowsToDelete(new Set());
  };

  const handleDeleteSelect = (id: string) => {
    const newSelected = new Set(rowsToDelete);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setRowsToDelete(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (rowsToDelete.size === 0) return;

    if (confirm(`¿Está seguro de eliminar ${rowsToDelete.size} registros?`)) {
      const result = await deleteServices(Array.from(rowsToDelete));
      if (result.success) {
        setData(data.filter((row) => !rowsToDelete.has(row.id)));
        setRowsToDelete(new Set());
        setIsDeleteMode(false);
      } else {
        alert('Error al eliminar registros');
      }
    }
  };

  const handleAddRecord = async () => {
    setIsAddingRecord(true);
    try {
      await addNewRow();
    } finally {
      setIsAddingRecord(false);
    }
  };

  return (
    <div className="relative">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleAddRecord}
            disabled={isAddingRecord}
            className="group relative flex h-10 w-36 cursor-pointer items-center overflow-hidden rounded-lg border border-green-500 bg-green-500 hover:bg-green-500 active:border-green-500 active:bg-green-500"
          >
            <span
              className={`ml-8 transform font-semibold text-white transition-all duration-300 ${
                isAddingRecord
                  ? 'translate-x-20 opacity-0'
                  : 'group-hover:translate-x-20 group-hover:opacity-0'
              }`}
            >
              Agregar
            </span>
            <span
              className={`absolute right-0 flex h-full w-10 transform items-center justify-center rounded-lg bg-green-500 transition-all duration-300 group-hover:w-full group-hover:translate-x-0 ${
                isAddingRecord ? 'w-full translate-x-0' : ''
              }`}
            >
              {isAddingRecord ? (
                <div className="loader" />
              ) : (
                <svg
                  className="w-8 text-white active:scale-75"
                  fill="none"
                  height="24"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <line x1="12" x2="12" y1="5" y2="19" />
                  <line x1="5" x2="19" y1="12" y2="12" />
                </svg>
              )}
            </span>
          </button>

          <button onClick={handleDeleteModeToggle} className="delete-button">
            <span className="text">
              {isDeleteMode ? 'Cancelar' : 'Eliminar'}
            </span>
            <span className="icon">
              {isDeleteMode ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <path d="M24 20.188l-8.315-8.209 8.2-8.282-3.697-3.697-8.212 8.318-8.31-8.203-3.666 3.666 8.321 8.24-8.206 8.313 3.666 3.666 8.237-8.318 8.285 8.203z" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 6v18h18v-18h-18zm5 14c0 .552-.448 1-1 1s-1-.448-1-1v-10c0-.552.448-1 1-1s1 .448 1 1v10zm5 0c0 .552-.448 1-1 1s-1-.448-1-1v-10c0-.552.448-1 1-1s1 .448 1 1v10zm5 0c0 .552-.448 1-1 1s-1-.448-1-1v-10c0-.552.448-1 1-1s1 .448 1 1v10zm4-18v2h-20v-2h5.711c.9 0 1.631-1.099 1.631-2h5.315c0 .901.73 2 1.631 2h5.712z" />
                </svg>
              )}
            </span>
          </button>
          {isDeleteMode && rowsToDelete.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Eliminar ({rowsToDelete.size})
            </button>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveChanges}
              disabled={!unsavedChanges || isSaving}
              className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:opacity-50"
            >
              {isSaving
                ? 'Guardando...'
                : unsavedChanges
                  ? 'Guardar'
                  : 'Guardado'}
            </button>
            {isSaving && (
              <div className="dot-spinner">
                <div className="dot-spinner__dot" />
                <div className="dot-spinner__dot" />
                <div className="dot-spinner__dot" />
                <div className="dot-spinner__dot" />
                <div className="dot-spinner__dot" />
                <div className="dot-spinner__dot" />
                <div className="dot-spinner__dot" />
                <div className="dot-spinner__dot" />
              </div>
            )}
          </div>
          <div className="ml-4 flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="rounded bg-gray-500 px-3 py-1 text-white hover:bg-gray-600"
              title="Reducir zoom"
            >
              -
            </button>
            <span className="text-sm text-black">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="rounded bg-gray-500 px-3 py-1 text-white hover:bg-gray-600"
              title="Aumentar zoom"
            >
              +
            </button>
          </div>
        </div>
        <time className="font-display text-2xl font-bold text-black">
          {currentDate}
        </time>
      </div>

      {/* Modificar la sección de la tabla */}
      <div
        className="table-container"
        style={{
          backgroundImage: 'url("/background-table.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          borderRadius: '8px',
          padding: '1rem',
        }}
      >
        <div
          className="table-scroll-container"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'left top',
            width: `${(1 / zoom) * 100}%`,
            height: `${(1 / zoom) * 100}%`,
            overflowX: zoom === 1 ? 'auto' : 'scroll',
            overflowY: 'auto',
          }}
        >
          <table className="w-full text-left text-sm text-gray-500">
            <HeaderTitles isDeleteMode={isDeleteMode} />
            <tbody>
              {paginatedData.map((row) => (
                <tr key={row.id} className="border-b hover:bg-gray-50">
                  {isDeleteMode && (
                    <td className="px-0.5 py-0.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={rowsToDelete.has(row.id)}
                          onChange={() => handleDeleteSelect(row.id)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </div>
                    </td>
                  )}
                  <td className="table-cell whitespace-nowrap">
                    {renderInput(row, 'serviceDate', 'date')}
                  </td>
                  <td className="table-cell whitespace-nowrap">
                    {renderInput(row, 'propertyId')}
                  </td>
                  <td className="table-cell whitespace-nowrap">
                    {getPropertyClientName(row.propertyId)}
                  </td>
                  <td className="table-cell whitespace-nowrap">
                    {renderInput(row, 'totalAmount', 'number')}
                  </td>
                  <td className="table-checkbox-cell whitespace-nowrap">
                    {renderInput(row, 'isRefreshService', 'checkbox')}
                  </td>
                  <td className="table-cell whitespace-nowrap">
                    {renderInput(row, 'employeeId')}
                  </td>
                  <td className="table-cell whitespace-nowrap">
                    {renderInput(row, 'hoursWorked', 'number')}
                  </td>
                  <td className="table-cell whitespace-nowrap">
                    {renderInput(row, 'workDate', 'date')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination />
    </div>
  );
}
