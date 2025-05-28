import { type CleaningService, type Property, RateType } from '~/types';

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
    case RateType.HOURLY_USD:
    case RateType.HOURLY_FL:
      return baseRate * hours;
    case RateType.DAILY_USD:
    case RateType.DAILY_FL:
    case RateType.PER_APT_FL:
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

export function calculateEmployeeMonthlyHours(
  services: CleaningService[],
  employeeId: string,
  month: number,
  year: number
): { totalHours: number; dailyHours: Map<string, number> } {
  const employeeServices = services.filter(
    (service) =>
      service.employeeId === employeeId &&
      new Date(service.serviceDate).getMonth() === month &&
      new Date(service.serviceDate).getFullYear() === year
  );

  const dailyHours = new Map<string, number>();
  let totalHours = 0;

  employeeServices.forEach((service) => {
    // Corregir el manejo de nullish
    const dateStr = new Date(service.serviceDate).toISOString().split('T')[0];
    if (!dateStr) return;

    const currentHours = dailyHours.get(dateStr) ?? 0;
    dailyHours.set(dateStr, currentHours + service.hoursWorked);
    totalHours += service.hoursWorked;
  });

  return {
    totalHours,
    dailyHours,
  };
}
