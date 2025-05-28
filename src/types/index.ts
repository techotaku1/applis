export enum RateType {
  HOURLY_USD = 'HOURLY_USD',
  HOURLY_FL = 'HOURLY_FL',
  DAILY_USD = 'DAILY_USD',
  DAILY_FL = 'DAILY_FL',
  PER_APT_FL = 'PER_APT_FL',
}

export enum TaxStatus {
  WITH_TAX = 'WITH_TAX',
  WITHOUT_TAX = 'WITHOUT_TAX',
}

export interface Property {
  id: string;
  name: string;
  clientName: string;
  regularRate: number;
  rateType: RateType;
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
