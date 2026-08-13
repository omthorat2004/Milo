import * as THREE from "three";

const WIDTH = 1024;
const HEIGHT = 176;

const SHELL = "#121716";
const BORDER = "#2b3531";
const LABEL = "#9c8a73";
const URL_TEXT = "#ede1d1";
const SIGNAL = "#3fcf8e";
const INK = "#060807";

const SANF = "system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

/**
 * The Milo viewer's top bar, drawn once as a texture.
 *
 * This is the moment the story needs to show: the resume is not an attachment
 * any more, it is open inside Milo, with a tracking URL and a Download button
 * that records an event before handing over the file.
 */
export function createViewerBarTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable.");

  ctx.fillStyle = SHELL;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = BORDER;
  ctx.fillRect(0, HEIGHT - 3, WIDTH, 3);

  ctx.textBaseline = "middle";
  const midline = HEIGHT / 2;

  // Wordmark.
  ctx.fillStyle = URL_TEXT;
  ctx.font = `600 34px ${SANF}`;
  ctx.fillText("Milo", 44, midline);

  // Signal dot, green means an event was recorded.
  ctx.beginPath();
  ctx.arc(126, midline, 6, 0, Math.PI * 2);
  ctx.fillStyle = SIGNAL;
  ctx.fill();

  // Tracking URL pill.
  const pillX = 176;
  const pillWidth = 430;
  roundedRect(ctx, pillX, midline - 27, pillWidth, 54, 27);
  ctx.fillStyle = "#0a0d0c";
  ctx.fill();
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = LABEL;
  ctx.font = `400 24px ${MONO}`;
  ctx.fillText("milo.app/r/", pillX + 26, midline);
  const prefixWidth = ctx.measureText("milo.app/r/").width;
  ctx.fillStyle = URL_TEXT;
  ctx.fillText("abc123", pillX + 26 + prefixWidth, midline);

  // Download button.
  const buttonWidth = 218;
  const buttonX = WIDTH - buttonWidth - 44;
  roundedRect(ctx, buttonX, midline - 27, buttonWidth, 54, 27);
  ctx.fillStyle = SIGNAL;
  ctx.fill();

  ctx.fillStyle = INK;
  ctx.font = `600 24px ${SANF}`;
  ctx.fillText("Download", buttonX + 74, midline);
  drawDownloadGlyph(ctx, buttonX + 42, midline);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function drawDownloadGlyph(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(x, y - 12);
  ctx.lineTo(x, y + 5);
  ctx.moveTo(x - 7, y - 2);
  ctx.lineTo(x, y + 5);
  ctx.lineTo(x + 7, y - 2);
  ctx.moveTo(x - 9, y + 12);
  ctx.lineTo(x + 9, y + 12);
  ctx.stroke();
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

export const VIEWER_BAR_ASPECT = WIDTH / HEIGHT;
