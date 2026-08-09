import { clamp } from "@/lib/utils";

/** Normalises global progress into a 0..1 value across one act's window. */
export function span(progress: number, start: number, end: number): number {
  if (end <= start) return progress >= end ? 1 : 0;
  return clamp((progress - start) / (end - start), 0, 1);
}

export function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

export function mix(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Ramps up over the first `edge` of the window and back down over the last. */
export function pulse(t: number, edge = 0.25): number {
  return Math.min(smoothstep(t / edge), smoothstep((1 - t) / edge));
}

/**
 * Scroll windows for each act, overlapping slightly so transitions cross-fade
 * instead of snapping. Kept next to the story script in lib/story.ts.
 */
export const ACT_WINDOWS = {
  hosted: [0.0, 0.2],
  shared: [0.17, 0.4],
  link: [0.37, 0.6],
  signal: [0.57, 0.8],
  insight: [0.77, 1.0],
} as const satisfies Record<string, readonly [number, number]>;

export type ActWindowName = keyof typeof ACT_WINDOWS;

export function actProgress(progress: number, name: ActWindowName): number {
  const [start, end] = ACT_WINDOWS[name];
  return span(progress, start, end);
}
