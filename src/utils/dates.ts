export function getCurrentColombiaDate(): Date {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
}

export function formatColombiaDate(date: Date): string {
  try {
    const colombiaDate = new Date(
      date.toLocaleString('en-US', { timeZone: 'America/Bogota' })
    );

    return colombiaDate
      .toLocaleDateString('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      .toUpperCase();
  } catch (error) {
    console.error('Error formatting date:', error);
    return new Date().toLocaleDateString('es-CO');
  }
}

export function formatColombiaDateTime(date: Date): string {
  try {
    // Create new Date instance to avoid modifying the original
    const dateToFormat = new Date(date);

    // Ensure we're using the actual date provided without timezone shifts
    const day = String(dateToFormat.getDate()).padStart(2, '0');
    const month = String(dateToFormat.getMonth() + 1).padStart(2, '0');
    const year = dateToFormat.getFullYear();

    return `${day}-${month}-${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}
