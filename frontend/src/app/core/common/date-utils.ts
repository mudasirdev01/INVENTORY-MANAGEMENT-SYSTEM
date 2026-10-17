export type DateValue = string | Date | null | undefined;

/** Format API dates for the UI without changing the API's ISO representation. */
export function formatDisplayDate(value: DateValue): string {
  if (!value) return '-';

  if (value instanceof Date) {
    return formatParts(value.getDate(), value.getMonth() + 1, value.getFullYear());
  }

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return formatParts(+isoMatch[3], +isoMatch[2], +isoMatch[1]);

  const displayMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (displayMatch) return value;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? String(value)
    : formatParts(parsed.getDate(), parsed.getMonth() + 1, parsed.getFullYear());
}

/** Convert a DatePicker value or DD/MM/YYYY text to Django's YYYY-MM-DD. */
export function toApiDate(value: DateValue): string {
  if (!value) return '';

  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const displayMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return displayMatch
    ? `${displayMatch[3]}-${displayMatch[2]}-${displayMatch[1]}`
    : '';
}

export function todayAsDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatParts(day: number, month: number, year: number): string {
  return `${pad(day)}/${pad(month)}/${year}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
