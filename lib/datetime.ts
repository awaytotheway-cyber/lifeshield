import { isValidIsoCalendarDate } from "@/lib/questionnaire/numbers";

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function todayLocalDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function dateFromYmd(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

export function isoToLocalDate(isoDate: string): Date | null {
  if (!isValidIsoCalendarDate(isoDate)) {
    return null;
  }
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function localDateToIso(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function formatDisplayDate(isoDate: string): string {
  const date = isoToLocalDate(isoDate);
  if (!date) {
    return isoDate;
  }
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const HHMM_RE = /^(\d{1,2}):([0-5]\d)$/;

export function isHHmm(value: string): boolean {
  const match = HHMM_RE.exec(value.trim());
  if (!match) {
    return false;
  }
  const hours = Number(match[1]);
  return hours >= 0 && hours <= 23;
}

export function hhmmToDate(value: string): Date {
  const match = HHMM_RE.exec(value.trim());
  const date = new Date();
  const hours = match ? Number(match[1]) : 0;
  const minutes = match ? Number(match[2]) : 0;
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function dateToHHmm(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** Always two-digit hours for HTML time inputs. */
export function toInputHHmm(value: string): string {
  if (!isHHmm(value)) {
    return "";
  }
  const [hours, minutes] = value.trim().split(":");
  return `${pad2(Number(hours))}:${minutes}`;
}

export function formatDisplayDuration(hhmm: string): string {
  if (!isHHmm(hhmm)) {
    return "";
  }
  const [hours, minutes] = hhmm.split(":").map(Number);
  if (hours === 0) {
    return `${minutes} min`;
  }
  if (minutes === 0) {
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  return `${hours} h ${minutes} min`;
}

export type DatePickerFieldProps = {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  error?: string;
  hint?: string;
  maximumDate?: Date;
  minimumDate?: Date;
};

export type TimePickerFieldProps = {
  label: string;
  value: string;
  onChange: (hhmm: string) => void;
  error?: string;
  hint?: string;
};
