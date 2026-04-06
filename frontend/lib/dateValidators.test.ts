import { formatDateInput, isValidBirthDate } from './dateValidators';

describe('formatDateInput', () => {
  it('formats numbers into DD/MM/YYYY', () => {
    expect(formatDateInput('1')).toBe('1');
    expect(formatDateInput('12')).toBe('12');
    expect(formatDateInput('123')).toBe('12/3');
    expect(formatDateInput('1234')).toBe('12/34');
    expect(formatDateInput('12345')).toBe('12/34/5');
    expect(formatDateInput('123456')).toBe('12/34/56');
    expect(formatDateInput('1234567')).toBe('12/34/567');
    expect(formatDateInput('12345678')).toBe('12/34/5678');
  });

  it('removes non-numeric characters', () => {
    expect(formatDateInput('12/34/5678')).toBe('12/34/5678');
    expect(formatDateInput('12-34-5678')).toBe('12/34/5678');
    expect(formatDateInput('12 34 5678')).toBe('12/34/5678');
  });

  it('limits to 8 digits', () => {
    expect(formatDateInput('123456789')).toBe('12/34/5678');
    expect(formatDateInput('1234567890')).toBe('12/34/5678');
  });

  it('handles empty string', () => {
    expect(formatDateInput('')).toBe('');
  });
});

describe('isValidBirthDate', () => {
  it('validates correct birth dates in DD/MM/YYYY format', () => {
    expect(isValidBirthDate('15/03/1990')).toBe(true);
    expect(isValidBirthDate('01/01/2000')).toBe(true);
    expect(isValidBirthDate('31/12/1980')).toBe(true);
  });

  it('rejects invalid date format', () => {
    expect(isValidBirthDate('15-03-1990')).toBe(false);
    expect(isValidBirthDate('1990-03-15')).toBe(false);
    expect(isValidBirthDate('15/3/1990')).toBe(false);
    expect(isValidBirthDate('15/03/90')).toBe(false);
    expect(isValidBirthDate('abc')).toBe(false);
  });

  it('rejects invalid dates', () => {
    expect(isValidBirthDate('32/01/1990')).toBe(false);
    expect(isValidBirthDate('30/02/2020')).toBe(false);
    expect(isValidBirthDate('31/04/1990')).toBe(false);
    expect(isValidBirthDate('00/01/1990')).toBe(false);
    expect(isValidBirthDate('15/13/1990')).toBe(false);
  });

  it('rejects future dates', () => {
    const futureYear = new Date().getFullYear() + 1;
    expect(isValidBirthDate(`15/03/${futureYear}`)).toBe(false);
  });

  it('rejects dates older than 120 years', () => {
    const veryOldYear = new Date().getFullYear() - 121;
    expect(isValidBirthDate(`15/03/${veryOldYear}`)).toBe(false);
  });

  it('accepts dates within valid age range (0-120 years)', () => {
    const thisYear = new Date().getFullYear();
    const maxYear = thisYear - 119;
    const minYear = thisYear - 1;

    expect(isValidBirthDate(`15/03/${maxYear}`)).toBe(true);
    expect(isValidBirthDate(`15/03/${minYear}`)).toBe(true);
  });

  it('handles empty string', () => {
    expect(isValidBirthDate('')).toBe(false);
  });

  it('handles leap year correctly', () => {
    expect(isValidBirthDate('29/02/2000')).toBe(true);
    expect(isValidBirthDate('29/02/1900')).toBe(false);
    expect(isValidBirthDate('29/02/2001')).toBe(false);
  });
});
