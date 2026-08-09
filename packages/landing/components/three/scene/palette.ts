/**
 * Scene colours, mirrored from the CSS tokens in app/globals.css.
 *
 * Three.js cannot read CSS custom properties, so the two lists are duplicated
 * deliberately and kept short. Green is reserved for recorded signals; sand and
 * clay carry paper and light.
 */
export const palette = {
  paper: "#efe4d4",
  sand: "#ede1d1",
  clay: "#c08d63",
  keyLight: "#fff2e2",
  fillLight: "#4a6f7a",
  signal: "#3fcf8e",
  signalSoft: "#7fe8b4",
  ink: "#060807",
} as const;
