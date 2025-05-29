import { RATE_TYPES, type CleaningService, type Property } from '~/types';

export function calculateServiceAmount(
  service: CleaningService,
  property: Property
): number {
  const baseRate = property.regularRate;
  const hours = service.hoursWorked;

  if (service.isRefreshService) {
    return property.refreshRate;
  }

  switch (property.rateType) {
    case RATE_TYPES.HOURLY_USD:
    case RATE_TYPES.HOURLY_FL:
      return baseRate * hours;
    case RATE_TYPES.DAILY_USD:
    case RATE_TYPES.DAILY_FL:
    case RATE_TYPES.PER_APT_FL:
      return baseRate;
    default:
      return 0;
  }
}

export function calculateDailyHours(
  services: CleaningService[],
  date: Date
): number {
  return services
    .filter((service) => {
      const serviceDate = new Date(service.serviceDate);
      return (
        serviceDate.getFullYear() === date.getFullYear() &&
        serviceDate.getMonth() === date.getMonth() &&
        serviceDate.getDate() === date.getDate()
      );
    })
    .reduce((total, service) => total + service.hoursWorked, 0);
}

export function formatTotalHours(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h ${minutes.toString().padStart(2, '0')}m`;
}

export function calculateEmployeeMonthlyHours(
  services: CleaningService[],
  employeeId: string,
  month: number,
  year: number
): {
  totalHours: number;
  totalFormatted: string;
  dailyHours: Map<string, number>;
} {
  const employeeServices = services.filter(
    (service) =>
      service.employeeId === employeeId &&
      new Date(service.serviceDate).getMonth() === month &&
      new Date(service.serviceDate).getFullYear() === year
  );

  const dailyHours = new Map<string, number>();
  let totalHours = 0;

  employeeServices.forEach((service) => {
    const dateStr = new Date(service.serviceDate).toISOString().split('T')[0];
    if (!dateStr) return;

    const currentHours = dailyHours.get(dateStr) ?? 0;
    dailyHours.set(dateStr, currentHours + service.hoursWorked);
    totalHours += service.hoursWorked;
  });

  return {
    totalHours,
    totalFormatted: formatTotalHours(totalHours),
    dailyHours,
  };
}
