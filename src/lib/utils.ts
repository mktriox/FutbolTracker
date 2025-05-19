import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { addDays, addWeeks, addMonths, differenceInYears, startOfWeek, endOfWeek, format } from 'date-fns';
import type { SuspensionUnit } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function calculateEndDate(startDate: Date, duration: number, unit: SuspensionUnit): Date {
  switch (unit) {
    case 'days':
 return addDays(startDate, duration); // Si la duración es 1 día, el jugador queda libre el día startDate + 1
 case 'dates': // 'dates' representa fines de semana/días de partido (asumiendo 1 día de partido por semana/ronda)
 return addWeeks(startDate, duration); // Si la duración es 1 'fecha', el jugador queda libre después de 1 semana
    case 'months':
 return addMonths(startDate, duration); // Si la duración es 1 mes, el jugador queda libre después de 1 mes
    default:
      return startDate;
 }
}


export function calculateAge(birthDate: Date, referenceDate: Date = new Date()): number {
  return differenceInYears(referenceDate, birthDate);
}

// Función de ejemplo para formatear fechas de manera consistente
export function formatDate(date: Date | string | number): string {
  try {
      return format(new Date(date), 'dd/MM/yyyy');
  } catch (error) {
      console.error("Error formatting date:", date, error);
      return "Invalid Date";
  }
}

// Función para verificar si una fecha está dentro de un período de suspensión
// Asume que suspension.endDate es exclusivo (el día en que el jugador queda libre)
export function isSuspended(suspension: { startDate: Date, endDate: Date }, checkDate: Date = new Date()): boolean {
  const normalizedCheckDate = new Date(checkDate);
  normalizedCheckDate.setHours(0, 0, 0, 0);
  
  const normalizedStartDate = new Date(suspension.startDate);
  normalizedStartDate.setHours(0, 0, 0, 0);

  const normalizedEndDate = new Date(suspension.endDate); // Este es el día en que quedan libres
  normalizedEndDate.setHours(0, 0, 0, 0);

  return normalizedCheckDate >= normalizedStartDate && normalizedCheckDate < normalizedEndDate;
}

// --- Validación RUT ---

/**
 * Calcula el dígito verificador (DV) para el cuerpo de un número RUT chileno.
 * @param rutBody El número RUT sin el dígito verificador (por ejemplo, "12345678").
 * @returns The calculated verification digit ('0'-'9' or 'K').
 */
export function calculateRutDv(rutBody: string): string {
  const rutClean = rutBody.replace(/[^0-9]/g, ''); // Ensure only numbers
  if (!rutClean) return ''; // Return empty if no valid number part

  let M = 0;
  let S = 1;
  for (let T = parseInt(rutClean, 10); T; T = Math.floor(T / 10)) {
    S = (S + T % 10 * (9 - M++ % 6)) % 11;
  }
  return S ? (S - 1).toString() : 'K';
}

/**
 * Valida un número RUT chileno (incluido el dígito verificador).
 * @param rut La cadena RUT completa (por ejemplo, "12.345.678-9" o "123456789").
 * @returns True if the RUT is valid, false otherwise.
 */
export function validateRut(rut: string | null | undefined): boolean {
  if (!rut) return false;

  const rutClean = rut.replace(/[^0-9kK]/g, '').toUpperCase(); // Keep numbers and K
  if (rutClean.length < 2) return false; // Must have at least number and DV

  const body = rutClean.slice(0, -1);
  const dv = rutClean.slice(-1);

  // Asegurarse de que el cuerpo contenga solo números
  if (!/^\d+$/.test(body)) {
      return false;
  }

  return calculateRutDv(body) === dv;
}

/**
 * Formatea una cadena RUT añadiendo puntos y guion.
 * @param rut La cadena RUT (por ejemplo, "123456789" o "12345678K").
 * @returns Formatted RUT string (e.g., "12.345.678-9" or "12.345.678-K") or the original string if invalid.
 */
export function formatRut(rut: string | null | undefined): string {
    if (!rut) return "";
    const rutClean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    if (rutClean.length < 2) return rut; // Return original if too short

    const body = rutClean.slice(0, -1);
    const dv = rutClean.slice(-1);

    // Asegurarse de que el cuerpo contenga solo números antes de formatear
    if (!/^\d+$/.test(body)) {
        return rut; // Return original if body is not numeric
    }

    let formattedBody = "";
    let count = 0;
    for (let i = body.length - 1; i >= 0; i--) {
        formattedBody = body[i] + formattedBody;
        count++;
        if (count === 3 && i !== 0) {
            formattedBody = "." + formattedBody;
            count = 0;
        }
    }

    return `${formattedBody}-${dv}`;
}
