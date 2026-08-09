import * as THREE from "three";

const PAGE_WIDTH = 720;
const PAGE_HEIGHT = 932; // ~US Letter aspect ratio.
const MARGIN = 62;
const CONTENT = PAGE_WIDTH - MARGIN * 2;

const PAPER = "#f2e8da";
const INK = "#241f19";
const INK_SOFT = "#5f5548";
const RULE = "#cbbca6";
const LINE = "#c3b5a2";
const ACCENT = "#2f9e6d";

const SANS = "system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

/**
 * Fictional sample resume drawn to an offscreen canvas.
 *
 * The card has to read as a real CV at a glance in 3D, so headings and the name
 * are rendered as actual text while body copy stays as abstract rules — real
 * paragraphs would be illegible at this scale and impossible to localise.
 * Every detail is invented; example.com addresses only.
 */
export function createResumeTexture(pageNumber: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_WIDTH;
  canvas.height = PAGE_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable.");

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  ctx.textBaseline = "top";

  const cursor = { y: MARGIN };

  if (pageNumber === 1) {
    drawHeader(ctx, cursor);
    drawSection(ctx, cursor, "Experience", [
      {
        role: "Senior Software Engineer",
        org: "Northwind Systems",
        period: "2022 — Present",
        lines: 4,
      },
      { role: "Software Engineer", org: "Cobalt Labs", period: "2019 — 2022", lines: 3 },
      { role: "Backend Engineer", org: "Fernway", period: "2018 — 2019", lines: 2 },
    ]);
    drawSkills(ctx, cursor);
    drawSection(ctx, cursor, "Education", [
      {
        role: "B.E. Computer Engineering",
        org: "University of Pune",
        period: "2015 — 2019",
        lines: 1,
      },
    ]);
  } else {
    drawContinuedHeader(ctx, cursor);
    drawSection(ctx, cursor, "Selected Projects", [
      { role: "Ledger — event pipeline", org: "Open source", period: "2024", lines: 2 },
      { role: "Atlas — design system", org: "Northwind Systems", period: "2023", lines: 2 },
    ]);
    drawSection(ctx, cursor, "Education", [
      {
        role: "B.E. Computer Engineering",
        org: "University of Pune",
        period: "2015 — 2019",
        lines: 1,
      },
    ]);
    drawSkills(ctx, cursor);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

type Cursor = { y: number };

type Entry = { role: string; org: string; period: string; lines: number };

function drawHeader(ctx: CanvasRenderingContext2D, cursor: Cursor): void {
  ctx.fillStyle = INK;
  ctx.font = `600 40px ${SANS}`;
  ctx.fillText("Aarav Mehta", MARGIN, cursor.y);
  cursor.y += 50;

  ctx.fillStyle = ACCENT;
  ctx.font = `500 19px ${SANS}`;
  ctx.fillText("Senior Software Engineer", MARGIN, cursor.y);
  cursor.y += 30;

  ctx.fillStyle = INK_SOFT;
  ctx.font = `400 15px ${SANS}`;
  ctx.fillText("aarav@example.com  ·  example.com/aarav  ·  github.com/example", MARGIN, cursor.y);
  cursor.y += 32;

  rule(ctx, cursor.y);
  cursor.y += 30;
}

function drawContinuedHeader(ctx: CanvasRenderingContext2D, cursor: Cursor): void {
  ctx.fillStyle = INK_SOFT;
  ctx.font = `500 16px ${SANS}`;
  ctx.fillText("Aarav Mehta", MARGIN, cursor.y);

  ctx.fillStyle = LINE;
  ctx.font = `400 14px ${SANS}`;
  ctx.textAlign = "right";
  ctx.fillText("Page 2", PAGE_WIDTH - MARGIN, cursor.y + 2);
  ctx.textAlign = "left";

  cursor.y += 30;
  rule(ctx, cursor.y);
  cursor.y += 30;
}

function drawSection(
  ctx: CanvasRenderingContext2D,
  cursor: Cursor,
  title: string,
  entries: readonly Entry[],
): void {
  ctx.fillStyle = INK_SOFT;
  ctx.font = `600 13px ${SANS}`;
  ctx.fillText(title.toUpperCase(), MARGIN, cursor.y);

  // Section marker — the only accent on the page, echoing the signal green.
  ctx.fillStyle = ACCENT;
  ctx.fillRect(MARGIN - 14, cursor.y + 1, 4, 12);
  cursor.y += 28;

  for (const entry of entries) {
    ctx.fillStyle = INK;
    ctx.font = `600 18px ${SANS}`;
    ctx.fillText(entry.role, MARGIN, cursor.y);

    ctx.fillStyle = LINE;
    ctx.font = `400 14px ${SANS}`;
    ctx.textAlign = "right";
    ctx.fillText(entry.period, PAGE_WIDTH - MARGIN, cursor.y + 3);
    ctx.textAlign = "left";
    cursor.y += 25;

    ctx.fillStyle = INK_SOFT;
    ctx.font = `400 15px ${SANS}`;
    ctx.fillText(entry.org, MARGIN, cursor.y);
    cursor.y += 26;

    for (let line = 0; line < entry.lines; line += 1) {
      const isLast = line === entry.lines - 1;
      ctx.fillStyle = LINE;
      ctx.fillRect(MARGIN + 12, cursor.y, CONTENT * (isLast ? 0.55 : 0.94) - 12, 7);
      cursor.y += 17;
    }

    cursor.y += 18;
  }
}

function drawSkills(ctx: CanvasRenderingContext2D, cursor: Cursor): void {
  ctx.fillStyle = INK_SOFT;
  ctx.font = `600 13px ${SANS}`;
  ctx.fillText("SKILLS", MARGIN, cursor.y);
  ctx.fillStyle = ACCENT;
  ctx.fillRect(MARGIN - 14, cursor.y + 1, 4, 12);
  cursor.y += 26;

  const chips = ["TypeScript", "Python", "React", "PostgreSQL", "FastAPI", "AWS", "Three.js"];
  ctx.font = `400 14px ${SANS}`;

  let x = MARGIN;
  for (const chip of chips) {
    const width = ctx.measureText(chip).width + 24;

    if (x + width > PAGE_WIDTH - MARGIN) {
      x = MARGIN;
      cursor.y += 34;
    }

    roundedRect(ctx, x, cursor.y, width, 26, 13);
    ctx.fillStyle = "#e2d5c1";
    ctx.fill();

    ctx.fillStyle = INK_SOFT;
    ctx.fillText(chip, x + 12, cursor.y + 5);
    x += width + 8;
  }

  cursor.y += 46;
}

function rule(ctx: CanvasRenderingContext2D, y: number): void {
  ctx.fillStyle = RULE;
  ctx.fillRect(MARGIN, y, CONTENT, 1.5);
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

export const PAGE_ASPECT = PAGE_WIDTH / PAGE_HEIGHT;
