/**
 * Formats a string of numbers into DD/MM/YYYY format
 * Only keeps the first 8 digits
 */
export function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Validates if a date string is a valid birth date
 * Format: DD/MM/YYYY
 * Checks:
 * - Valid date format
 * - Valid date (considering leap years, days per month)
 * - Not in the future
 * - Not older than 120 years
 */
export function isValidBirthDate(dateStr: string): boolean {
  if (!dateStr || dateStr.length !== 10) return false;

  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = dateStr.match(regex);

  if (!match) return false;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  // Check month range
  if (month < 1 || month > 12) return false;

  // Check day range
  if (day < 1 || day > 31) return false;

  // Days per month
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Check leap year
  const isLeapYear = (y: number) =>
    (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

  if (isLeapYear(year)) {
    daysInMonth[1] = 29;
  }

  // Check day in month
  if (day > daysInMonth[month - 1]) return false;

  // Create date object and verify it's valid
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return false;
  }

  // Check if not in the future
  const today = new Date();
  if (date > today) return false;

  // Check if not older than 120 years
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 120);
  if (date < maxDate) return false;

  return true;
}
