export function formatRateType(rateType: string, value: number): string {
  switch (rateType) {
    case 'HOURLY_USD':
      return `${value} USD x Hora`;
    case 'HOURLY_FL':
      return `${value} FL x Hora`;
    case 'DAILY_USD':
      return `${value} USD x Día`;
    case 'DAILY_FL':
      return `${value} FL x Día`;
    case 'PER_APT_FL':
      return `${value} FL x Apto`;
    default:
      return `${value} ${rateType}`;
  }
}
