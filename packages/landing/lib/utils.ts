import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Maps a value from one range to another, clamped to the output range. */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  if (inMax === inMin) return outMin;
  const t = (value - inMin) / (inMax - inMin);
  return outMin + clamp(t, 0, 1) * (outMax - outMin);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Framerate-independent lerp. `smoothing` is the fraction remaining after 1s. */
export function damp(current: number, target: number, smoothing: number, delta: number): number {
  return target + (current - target) * Math.exp(-smoothing * delta);
}
