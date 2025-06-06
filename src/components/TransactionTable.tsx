'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

import { useUser } from '@clerk/nextjs';

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

import '~/styles/buttonLoader.css';
import '~/styles/deleteButton.css';
import HeaderTitles from './HeaderTitles';

type InputValue = string | number | boolean | Date | null;
type InputType = 'text' | 'number' | 'date' | 'checkbox' | 'select';
type HandleInputChange = (
  id: string,
  field: keyof CleaningService,
  value: InputValue
) => void;

interface TransactionTableProps {
  initialData: CleaningService[];
  onUpdateRecordAction: (records: CleaningService[]) => Promise<SaveResult>;
}

// Actualizar la función getCurrentColombiaDate
function getCurrentColombiaDate(): Date {
  const now = new Date();
  const colombiaOptions = { timeZone: 'America/Bogota' };
  const colombiaDate = new Date(now.toLocaleString('en-US', colombiaOptions));
  return colombiaDate;
}

// Update the hours calculation function to preserve minutes
function calculateHoursBetweenDates(startDate: Date, endDate: Date): number {
  const diff = endDate.getTime() - startDate.getTime();
  const diffInMinutes = diff / (1000 * 60); // Get total minutes
  const hours = Math.floor(diffInMinutes / 60); // Get whole hours
  const minutes = diffInMinutes % 60; // Get remaining minutes
  return hours + minutes / 60; // Convert to decimal hours
}

// Actualizar la función formatCurrentDate
function formatCurrentDate(date: Date): string {
  try {
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Bogota',
    } as const;

    return new Intl.DateTimeFormat('es-CO', options).format(date).toUpperCase();
  } catch (error) {
    console.error('Error formatting date:', error);
    return new Date().toLocaleDateString('es-CO');
  }
}

interface PropertySelectProps {
  value: string;
  onChange: (propertyId: string, property: Property) => void;
  properties: Property[];
  disabled?: boolean;
}

const PropertySelect = ({
  value,
  onChange,
  properties,
  disabled = false,
}: PropertySelectProps) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => {
        const property = properties.find((p) => p.id === e.target.value);
        if (property) {
          onChange(e.target.value, property);
        }
      }}
      disabled={disabled}
      className={`table-select-field w-full truncate ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      title={properties.find((p) => p.id === value)?.name ?? ''}
    >
      <option value="">Seleccionar propiedad</option>
      {properties.map((property) => (
        <option key={property.id} value={property.id} title={property.name}>
          {property.name}
        </option>
      ))}
    </select>
  </div>
);

interface EmployeeSelectProps {
  value: string;
  employees: Employee[];
  currentUser: { firstName?: string | null };
  isAdmin?: boolean;
  serviceEmployeeId?: string;
}

const EmployeeSelect = ({
  employees,
  currentUser,
  isAdmin = false,
  serviceEmployeeId,
}: EmployeeSelectProps) => {
  // Si hay un employeeId en el servicio, mostrar ese empleado
  if (serviceEmployeeId) {
    const serviceEmployee = employees.find((e) => e.id === serviceEmployeeId);
    if (serviceEmployee) {
      return (
        <div className="relative w-full">
          <div className="table-select-field w-full text-center">
            {`${serviceEmployee.firstName} ${serviceEmployee.lastName}`}
          </div>
        </div>
      );
    }
  }

  // Si no hay employeeId y es admin, mostrar el nombre del admin
  if (isAdmin && !serviceEmployeeId) {
    return (
      <div className="relative w-full">
        <div className="table-select-field w-full text-center">
          {currentUser?.firstName ?? ''}
        </div>
      </div>
    );
  }

  // Para empleados no admin, mostrar su propio nombre
  const currentEmployee = employees.find(
    (e) => e.firstName?.toLowerCase() === currentUser?.firstName?.toLowerCase()
  );

  return (
    <div className="relative w-full">
      <div className="table-select-field w-full text-center">
        {currentEmployee
          ? `${currentEmployee.firstName} ${currentEmployee.lastName}`
          : 'No encontrado'}
      </div>
    </div>
  );
};

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

// Keep just one implementation of useEditPermissions
function useEditPermissions() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === 'admin';
  const userEmployeeId = user?.publicMetadata?.employeeId as string | undefined;

  return {
    canEdit: useCallback(
      (record: CleaningService, _field?: keyof CleaningService) => {
        // Add validation to ensure record is not empty
        if (!record || typeof record !== 'object') {
          return { allowed: false, message: 'Registro no válido' };
        }

        if (isAdmin) return { allowed: true };

        const today = getCurrentColombiaDate();
        const recordDate = new Date(record.serviceDate);
        today.setHours(0, 0, 0, 0);
        recordDate.setHours(0, 0, 0, 0);

        // Past dates - block all edits including laundry and refresh
        if (recordDate.getTime() < today.getTime()) {
          return {
            allowed: false,
            message: 'No se pueden editar registros de días anteriores',
          };
        }

        // Additional permission checks for current and future dates
        if (!record.employeeId) return { allowed: true };

        if (record.employeeId !== userEmployeeId) {
          return {
            allowed: false,
            message: 'Solo puedes editar tus propios registros',
          };
        }

        return { allowed: true };
      },
      [isAdmin, userEmployeeId]
    ),
    canDelete: useCallback(
      (record: CleaningService) => {
        // Add validation for delete permission
        if (!record || typeof record !== 'object') {
          return { allowed: false, message: 'Registro no válido' };
        }

        if (isAdmin) return { allowed: true };

        const today = getCurrentColombiaDate();
        const recordDate = new Date(record.serviceDate);
        today.setHours(0, 0, 0, 0);
        recordDate.setHours(0, 0, 0, 0);

        if (recordDate.getTime() < today.getTime()) {
          return {
            allowed: false,
            message: 'No se pueden eliminar registros de días anteriores',
          };
        }

        return { allowed: true };
      },
      [isAdmin]
    ),
    isAdmin,
  };
}

function formatHoursAndMinutes(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h ${minutes.toString().padStart(2, '0')}m`;
}

export default function TransactionTable({
  initialData,
  onUpdateRecordAction,
}: TransactionTableProps): React.JSX.Element {
  const { isLoaded: isUserLoaded, user } = useUser();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isUserLoaded && user) {
      setIsInitialized(true);
    }
  }, [isUserLoaded, user]);

  const { canEdit, canDelete, isAdmin } = useEditPermissions(); // Add isAdmin here

  const [data, setData] = useState<CleaningService[]>(initialData);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return formatCurrentDate(now);
  });
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
      const colombiaDate = getCurrentColombiaDate();
      const results = await Promise.all([getProperties(), getEmployees()]);
      const firstProperty = results[0]?.[0];
      const adminEmployee = employees.find(
        (e) => e.firstName?.toLowerCase() === user?.firstName?.toLowerCase()
      );

      if (!firstProperty) {
        throw new Error('No hay propiedades disponibles');
      }

      if (!adminEmployee) {
        throw new Error('Error al identificar el administrador');
      }

      const newRow: CleaningService = {
        id: crypto.randomUUID(),
        propertyId: firstProperty.id,
        employeeId: adminEmployee.id, // Usar el ID del admin
        serviceDate: colombiaDate,
        workDate: colombiaDate,
        hoursWorked: 0,
        isRefreshService: false,
        totalAmount: calculateTotalAmount(firstProperty, false, 0),
        laundryFee: 0,
        refreshFee: 0,
        notes: null,
        createdAt: colombiaDate,
        updatedAt: colombiaDate,
      };

      const result = await createService(newRow);
      if (result.success) {
        setData((prevData) => {
          const uiRow = {
            ...newRow,
            employeeId: isAdmin ? '' : adminEmployee.id, // Para la UI, mostrar vacío si es admin
          };
          return [uiRow, ...prevData];
        });

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

  // Update the handleSaveSuccess callback
  const handleSaveSuccess = useCallback(() => {
    setUnsavedChanges(false);
    setIsSaving(false);
  }, []);

  // Update debouncedSave initialization with shorter delay
  const debouncedSave = useDebouncedSave(
    onUpdateRecordAction,
    handleSaveSuccess,
    1000 // Reduced from 2000 to 1000ms for faster response
  );

  const handlePropertyChange = useCallback(
    (serviceId: string, propertyId: string, property: Property) => {
      setData((prevData) => {
        const newData = prevData.map((service) => {
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
        });

        setUnsavedChanges(true);
        void debouncedSave(newData);
        return newData;
      });
    },
    [debouncedSave]
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

  // Update handleInputChange to use canEdit
  const handleInputChange: HandleInputChange = useCallback(
    (id, field, value) => {
      const record = data.find((r) => r.id === id);

      if (!record) {
        alert('Registro no encontrado');
        return;
      }

      if (!record.serviceDate || !(record.serviceDate instanceof Date)) {
        alert('Fecha de servicio inválida');
        return;
      }

      // Special case for new records
      if (field === 'employeeId' && !record.employeeId) {
        setData((prevData) => {
          const newData = prevData.map((row) => {
            if (row.id === id) {
              const updatedRow = { ...row };
              updatedRow[field] = value as never;
              return updatedRow;
            }
            return row;
          });

          // Trigger save immediately after state update
          setUnsavedChanges(true);
          void debouncedSave(newData);
          return newData;
        });
        return;
      }

      const editPermission = canEdit(record);
      if (!editPermission.allowed) {
        alert(editPermission.message);
        return;
      }

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

            // For property changes, update totalAmount
            if (field === 'propertyId') {
              const property = properties.find((p) => p.id === value);
              if (property) {
                updatedRow.totalAmount = calculateTotalAmount(
                  property,
                  updatedRow.isRefreshService,
                  updatedRow.hoursWorked
                );
              }
            }

            return updatedRow;
          }
          return row;
        });

        // Trigger save immediately after state update
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
    [data, debouncedSave, groupedByDate, properties, canEdit]
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
          <div className="flex items-center justify-center text-black">
            <span className="text-sm font-medium text-black">
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
        const editPermission = canEdit(row);
        return (
          <PropertySelect
            value={row.propertyId}
            onChange={(propertyId, property) =>
              handlePropertyChange(row.id, propertyId, property)
            }
            properties={properties}
            disabled={!editPermission.allowed}
          />
        );
      }

      // Select de empleados
      if (field === 'employeeId') {
        return (
          <EmployeeSelect
            value={row.employeeId}
            employees={employees}
            currentUser={user ?? { firstName: null }}
            isAdmin={isAdmin}
            serviceEmployeeId={row.employeeId} // Añadir el employeeId del servicio
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

      // Campos adicionales: laundryFee y refreshFee
      if (field === 'laundryFee') {
        return (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={Boolean(row.laundryFee)}
              onChange={(e) =>
                handleInputChange(
                  row.id,
                  'laundryFee',
                  e.target.checked ? 1 : 0
                )
              }
              className="h-4 w-4 rounded border-gray-300"
              disabled={!canEdit(row)}
            />
          </div>
        );
      }

      if (field === 'refreshFee') {
        return (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={Boolean(row.refreshFee)}
              onChange={(e) =>
                handleInputChange(
                  row.id,
                  'refreshFee',
                  e.target.checked ? 1 : 0
                )
              }
              className="h-4 w-4 rounded border-gray-300"
              disabled={!canEdit(row)}
            />
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
          disabled={!canEdit(row)}
        />
      );
    },
    [
      handleInputChange,
      properties,
      employees,
      handlePropertyChange,
      canEdit,
      user,
      isAdmin,
    ]
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

  // Modificar el useEffect que maneja la fecha del grupo
  useEffect(() => {
    const dateStr = currentDateGroup[0];
    if (!dateStr) return;

    try {
      // Get the first service date from the group to ensure exact match
      const firstService = paginatedData[0];
      if (firstService) {
        setCurrentDate(formatCurrentDate(firstService.serviceDate));
      }
    } catch (error) {
      console.error('Error handling date group:', error);
    }
  }, [currentDateGroup, paginatedData]);

  // Add pagination controls component
  const Pagination = () => (
    <div className="mt-1 flex justify-center gap-2">
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

  const handleDeleteModeToggle = useCallback(() => {
    setIsDeleteMode(!isDeleteMode);
    setRowsToDelete(new Set());
  }, [isDeleteMode]);

  const handleDeleteSelect = useCallback(
    (id: string) => {
      const record = data.find((r) => r.id === id);
      if (!record) return;

      const deletePermission = canDelete(record);
      if (!deletePermission.allowed) {
        alert(deletePermission.message);
        return;
      }

      setRowsToDelete((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return newSet;
      });
    },
    [data, canDelete]
  );

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
    if (!isInitialized || !isUserLoaded || !user) {
      alert('Por favor espere mientras se carga la información del usuario');
      return;
    }

    setIsAddingRecord(true);
    try {
      await addNewRow();
    } finally {
      setIsAddingRecord(false);
    }
  };

  // Disable interactions until fully loaded
  const isInteractionDisabled = !isInitialized || !isUserLoaded || !user;

  return (
    <div className="relative">
      {/* Mobile Controls */}
      <div className="flex flex-col items-center gap-4 sm:hidden">
        <button
          onClick={handleSaveChanges}
          disabled={!unsavedChanges || isSaving}
          className="w-full rounded bg-green-500 px-2 py-2 text-xs text-white hover:bg-green-600 disabled:opacity-50 sm:px-4 sm:py-2 sm:text-base"
        >
          {isSaving ? 'Guardando...' : unsavedChanges ? 'Guardar' : 'Guardado'}
        </button>

        <div className="flex justify-center gap-2">
          <button
            onClick={handleAddRecord}
            disabled={isAddingRecord || isInteractionDisabled}
            className="group relative flex h-10 w-[150px] cursor-pointer items-center overflow-hidden rounded-lg border border-green-500 bg-green-500 hover:bg-green-500 active:border-green-500 active:bg-green-500 disabled:opacity-50"
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
                  className="w-8 text-white group-active:scale-[0.8]"
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

          <button
            onClick={handleDeleteModeToggle}
            className="delete-button w-[150px]"
          >
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
        </div>

        {isDeleteMode && rowsToDelete.size > 0 && (
          <button
            onClick={handleDeleteSelected}
            className="w-full rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Eliminar ({rowsToDelete.size})
          </button>
        )}

        {/* Remove zoom controls from mobile view */}
        <time className="font-display mb-4 text-xl font-extrabold text-black">
          {currentDate}
        </time>
      </div>

      {/* Desktop Controls - Keep existing layout */}
      <div className="mb-4 hidden sm:flex sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          {/* Botón agregar */}
          <button
            onClick={handleAddRecord}
            disabled={isAddingRecord || isInteractionDisabled}
            className="group relative flex h-8 w-full cursor-pointer items-center overflow-hidden rounded-lg border border-green-500 bg-green-500 hover:bg-green-500 active:border-green-500 active:bg-green-500 disabled:opacity-50 sm:h-10 sm:w-36"
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
                  className="w-8 text-white group-active:scale-[0.8]"
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

          {/* Mostrar botón eliminar */}
          <button
            onClick={handleDeleteModeToggle}
            className="delete-button w-full sm:w-auto"
          >
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
              className="w-full rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 sm:w-auto"
            >
              Eliminar ({rowsToDelete.size})
            </button>
          )}

          <button
            onClick={handleSaveChanges}
            disabled={!unsavedChanges || isSaving}
            className="w-full rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:opacity-50 sm:w-auto"
          >
            {isSaving
              ? 'Guardando...'
              : unsavedChanges
                ? 'Guardar'
                : 'Guardado'}
          </button>
        </div>

        <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
          <div className="flex items-center gap-2">
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

          <time className="font-display text-xl font-extrabold text-black sm:text-3xl">
            {currentDate}
          </time>
        </div>
      </div>

      {/* Table Container */}
      <div className="table-container">
        {/* Desktop Table */}
        <div className="hidden sm:block">
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
              <HeaderTitles isDeleteMode={isDeleteMode} isAdmin={isAdmin} />
              <tbody>
                {paginatedData.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-gray-50">
                    {isDeleteMode && (
                      <td className="border-r px-0.5 py-0.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={rowsToDelete.has(row.id)}
                            onChange={() => handleDeleteSelect(row.id)}
                            disabled={!canDelete(row)}
                            className={`h-4 w-4 rounded border-gray-300 ${!canDelete(row) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
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
                    {isAdmin && (
                      <td className="table-cell whitespace-nowrap">
                        {renderInput(row, 'totalAmount', 'number')}
                      </td>
                    )}
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

        {/* Mobile Table */}
        <div className="block overflow-y-auto sm:hidden">
          <div className="space-y-2 pb-4">
            {paginatedData.map((row) => (
              <div key={row.id} className="mobile-table-row">
                <div className="space-y-3">
                  {isDeleteMode && (
                    <div className="mobile-table-cell">
                      <span className="font-medium">Eliminar</span>
                      <input
                        type="checkbox"
                        checked={rowsToDelete.has(row.id)}
                        onChange={() => handleDeleteSelect(row.id)}
                        disabled={!canDelete(row)}
                        className={`h-5 w-5 rounded border-gray-300 ${!canDelete(row) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      />
                    </div>
                  )}
                  <div className="mobile-table-cell">
                    <span className="font-medium">Hora Inicial</span>
                    <div className="w-[170px]">
                      {renderInput(row, 'serviceDate', 'date')}
                    </div>
                  </div>
                  <div className="mobile-table-cell">
                    <span className="font-medium">Propiedad</span>
                    <div className="w-[180px]">
                      {renderInput(row, 'propertyId')}
                    </div>
                  </div>
                  <div className="mobile-table-cell">
                    <span className="font-medium">Cliente</span>
                    <span className="w-[140px] text-right">
                      {getPropertyClientName(row.propertyId)}
                    </span>
                  </div>
                  {isAdmin && (
                    <div className="mobile-table-cell">
                      <span className="font-medium">Valor</span>
                      <div className="w-[140px]">
                        {renderInput(row, 'totalAmount', 'number')}
                      </div>
                    </div>
                  )}
                  <div className="mobile-table-cell">
                    <span className="font-medium">Tiempo</span>
                    <div className="w-[140px]">
                      {renderInput(row, 'isRefreshService', 'checkbox')}
                    </div>
                  </div>
                  <div className="mobile-table-cell">
                    <span className="font-medium">Empleado</span>
                    <div className="w-[180px]">
                      {renderInput(row, 'employeeId')}
                    </div>
                  </div>
                  <div className="mobile-table-cell">
                    <span className="font-medium">Horas</span>
                    <div className="w-[140px]">
                      {renderInput(row, 'hoursWorked', 'number')}
                    </div>
                  </div>
                  <div className="mobile-table-cell">
                    <span className="font-medium">Hora Final</span>
                    <div className="w-[170px]">
                      {renderInput(row, 'workDate', 'date')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pagination */}
      <Pagination />
    </div>
  );
}
