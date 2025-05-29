export const RATE_TYPES = {
  HOURLY_USD: 'USD x HORA',
  HOURLY_FL: 'FL x HORA',
  DAILY_USD: 'USD x DIA',
  DAILY_FL: 'FL x DIA',
  PER_APT_FL: 'FL x APTO',
} as const;

export type RateType = (typeof RATE_TYPES)[keyof typeof RATE_TYPES];

export const TAX_STATUS = {
  WITH_TAX: 'WITH_TAX',
  WITHOUT_TAX: 'WITHOUT_TAX',
} as const;

export type TaxStatus = (typeof TAX_STATUS)[keyof typeof TAX_STATUS];

export interface Property {
  id: string;
  name: string;
  clientName: string;
  regularRate: number;
  rateType: string; // Now just a string instead of enum
  refreshRate: number;
  standardHours: string;
  taxStatus: TaxStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  active: boolean;
  startDate: Date;
  phone?: string | null;
  email?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CleaningService {
  id: string;
  propertyId: string;
  employeeId: string;
  serviceDate: Date;
  hoursWorked: number;
  isRefreshService: boolean;
  totalAmount: number;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionRecord {
  id: string;
  fecha: Date;
  tramite: string;
  pagado: boolean;
  boleta: boolean;
  boletasRegistradas: number;
  emitidoPor: string;
  placa: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombre: string;
  cilindraje: number | null;
  tipoVehiculo: string | null;
  celular: string | null;
  ciudad: string;
  asesor: string;
  novedad: string | null;
  precioNeto: number;
  comisionExtra: boolean;
  tarifaServicio: number;
  impuesto4x1000: number;
  gananciaBruta: number;
  rappi: boolean;
  observaciones: string | null;
}

export interface SaveResult {
  success: boolean;
  error?: string;
}
