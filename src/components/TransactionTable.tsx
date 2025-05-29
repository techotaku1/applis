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

import '~/styles/spinner.css';
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

function getCurrentDate(): string {
  const today = new Date();
  const formatter = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Bogota',
  });
  return formatter.format(today).toUpperCase();
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
        {property.name} - {property.clientName}
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
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="table-select-field w-full"
  >
    <option value="">Seleccionar empleado</option>
    {employees.map((employee: Employee) => (
      <option key={employee.id} value={employee.id}>
        {employee.firstName} {employee.lastName}
      </option>
    ))}
  </select>
);

export default function TransactionTable({
  initialData,
  onUpdateRecordAction,
}: TransactionTableProps): React.JSX.Element {
  const [data, setData] = useState<CleaningService[]>(initialData);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentDate, setCurrentDate] = useState(getCurrentDate());
  const [isSaving, setIsSaving] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [rowsToDelete, setRowsToDelete] = useState<Set<string>>(new Set());
  const [properties, setProperties] = useState<Property[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Cargar propiedades y empleados al montar el componente
  useEffect(() => {
    getProperties().then(setProperties).catch(console.error);
    getEmployees().then(setEmployees).catch(console.error);
  }, []);

  const addNewRow = async () => {
    try {
      const now = new Date();
      const colombiaDate = new Date(
        now.toLocaleString('en-US', { timeZone: 'America/Bogota' })
      );

      const [firstProperty, firstEmployee] = await Promise.all([
        getProperties().then((props) => props[0]),
        getEmployees().then((emps) => emps[0]),
      ]);

      if (!firstProperty || !firstEmployee) {
        throw new Error('No hay propiedades o empleados disponibles');
      }

      const newRow: CleaningService = {
        id: crypto.randomUUID(),
        propertyId: firstProperty.id,
        employeeId: firstEmployee.id,
        serviceDate: colombiaDate,
        hoursWorked: 0,
        isRefreshService: false,
        totalAmount: calculateInitialAmount(firstProperty),
        notes: null,
        createdAt: colombiaDate,
        updatedAt: colombiaDate,
      };

      const result = await createService(newRow);
      if (result.success) {
        setData((prevData) => [newRow, ...prevData]);
        await handleSaveOperation([newRow, ...data]);
      } else {
        alert(result.error ?? 'Error al crear el servicio');
      }
    } catch (error) {
      console.error('Error creating new service:', error);
      alert(
        'Error al crear el servicio. Verifique que existan propiedades y empleados registrados.'
      );
    }
  };

  const calculateInitialAmount = (property: Property) => {
    return property.regularRate;
  };

  const calculateTotalAmount = useCallback(
    (property: Property, isRefresh: boolean, hours: number) => {
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
    },
    []
  );

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
    [calculateTotalAmount] // Add calculateTotalAmount as dependency
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

            if (field === 'serviceDate' && value instanceof Date) {
              updatedRow.serviceDate = value;
            } else if (field === 'hoursWorked' || field === 'totalAmount') {
              updatedRow[field] =
                typeof value === 'string' ? Number(value) : (value as number);
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

  const renderInput = useCallback(
    (
      row: CleaningService,
      field: keyof CleaningService,
      _type: InputType = 'text'
    ) => {
      const value = row[field];
      const isMoneyField = ['totalAmount', 'hoursWorked'].includes(
        field as string
      );

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

      // Manejar fecha
      if (field === 'serviceDate') {
        return (
          <div className="relative flex w-full items-center justify-center">
            <input
              type="datetime-local"
              value={
                value instanceof Date ? value.toISOString().slice(0, 16) : ''
              }
              onChange={(e) => {
                try {
                  const inputDate = new Date(e.target.value + ':00Z');
                  handleInputChange(row.id, field, inputDate);
                } catch (error) {
                  console.error('Error converting date:', error);
                }
              }}
              className="table-date-field flex cursor-pointer items-center justify-center rounded border px-0 py-0.5 text-center text-[10px]"
            />
          </div>
        );
      }

      // Modificar el renderizado del valor del servicio y tipo de pago
      if (field === 'totalAmount') {
        const property = properties.find((p) => p.id === row.propertyId);
        if (!property) return null;

        return (
          <div className="flex flex-col items-center justify-center px-2">
            <span className="font-medium">{property.regularRate}</span>
            <span className="text-xs text-gray-600">{property.rateType}</span>
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
      if (field === 'hoursWorked') {
        return (
          <input
            type="number"
            value={value?.toString() ?? '0'}
            onChange={(e) =>
              handleInputChange(row.id, field, Number(e.target.value))
            }
            className="table-numeric-field w-[70px]"
            min="0"
            step="0.5"
          />
        );
      }

      // Campos numéricos y texto
      return (
        <input
          type={isMoneyField ? 'number' : 'text'}
          value={value?.toString() ?? ''}
          onChange={(e) => {
            const newValue = isMoneyField
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

    const date = new Date(`${dateStr}T12:00:00-05:00`);
    if (isNaN(date.getTime())) return;

    const formatter = new Intl.DateTimeFormat('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Bogota',
    });

    setCurrentDate(formatter.format(date).toUpperCase());
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

  return (
    <div className="relative">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={addNewRow}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Agregar Registro
          </button>
          <button
            onClick={handleDeleteModeToggle}
            className={`rounded px-4 py-2 text-white ${
              isDeleteMode
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gray-500 hover:bg-gray-600'
            }`}
          >
            {isDeleteMode ? 'Cancelar' : 'Eliminar Registros'}
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
            <HeaderTitles />
            <tbody>
              {paginatedData.map((row) => (
                <tr key={row.id} className="border-b hover:bg-gray-50">
                  {isDeleteMode && (
                    <td className="px-0.5 py-0.5 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={rowsToDelete.has(row.id)}
                        onChange={() => handleDeleteSelect(row.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
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
