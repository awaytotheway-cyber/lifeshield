/**
 * Safe number helpers. Never send NaN to the database.
 */

export function parseFiniteNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }
  const trimmed = String(raw).trim().replace(",", ".");
  if (trimmed === "") {
    return null;
  }
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function numberToField(value: unknown): string {
  const n = parseFiniteNumber(value);
  if (n === null) {
    return "";
  }
  return String(value);
}

export function calcBmi(heightCm: unknown, weightKg: unknown): number | null {
  const height = parseFiniteNumber(heightCm);
  const weight = parseFiniteNumber(weightKg);
  if (height === null || weight === null || height <= 0) {
    return null;
  }
  const bmi = weight / (height / 100) ** 2;
  if (!Number.isFinite(bmi)) {
    return null;
  }
  return Math.round(bmi * 10) / 10;
}

export function calcWhr(waistCm: unknown, hipCm: unknown): number | null {
  const waist = parseFiniteNumber(waistCm);
  const hip = parseFiniteNumber(hipCm);
  if (waist === null || hip === null || hip <= 0) {
    return null;
  }
  const ratio = waist / hip;
  if (!Number.isFinite(ratio)) {
    return null;
  }
  return Math.round(ratio * 100) / 100;
}

export function ageFromDob(isoDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return null;
  }
  const [year, month, day] = isoDate.split("-").map(Number);
  const dob = new Date(year, month - 1, day);
  if (
    dob.getFullYear() !== year ||
    dob.getMonth() !== month - 1 ||
    dob.getDate() !== day
  ) {
    return null;
  }
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - (month - 1);
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
    age -= 1;
  }
  return age >= 0 && age < 130 ? age : null;
}

export function isRealIsoDate(isoDate: string): boolean {
  return ageFromDob(isoDate) !== null;
}

/** Calendar date only (YYYY-MM-DD). Use this for mammograms / exposure dates, not age. */
export function isValidIsoCalendarDate(isoDate: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return false;
  }
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}
