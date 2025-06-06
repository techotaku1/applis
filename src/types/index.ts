export const RATE_TYPES = {
  HOURLY_USD: 'USD x Hora',
  HOURLY_FL: 'FL x Hora',
  DAILY_USD: 'USD x Día',
  DAILY_FL: 'FL x Día',
  PER_APT_FL: 'FL x Apto',
} as const;

export type RateType = (typeof RATE_TYPES)[keyof typeof RATE_TYPES];

export const TAX_STATUS = {
  WITH_TAX: 'WITH_TAX',
  WITHOUT_TAX: 'WITHOUT_TAX',
} as const;

export type TaxStatus = (typeof TAX_STATUS)[keyof typeof TAX_STATUS];

export const USER_ROLES = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

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
  clerkId?: string | null;
  role: UserRole; // Aquí está el cambio clave - usar UserRole en lugar de string
}

export interface CleaningService {
  id: string;
  propertyId: string;
  employeeId: string;
  serviceDate: Date;
  workDate: Date; // Nueva propiedad para fecha de trabajo
  hoursWorked: number;
  isRefreshService: boolean;
  totalAmount: number;
  laundryFee: number;
  refreshFee: number;
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
