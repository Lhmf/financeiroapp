import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function firstError(
  fieldErrors: Record<string, string[] | undefined>,
): string | undefined {
  return Object.values(fieldErrors).flat().filter(Boolean)[0];
}
