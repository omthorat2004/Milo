import { describe, expect, it } from "vitest";

import * as icons from "lucide-react";

// Every icon the landing, UI and frontend packages import from lucide-react.
// Keeping this list complete means a dependency bump that drops or renames one
// of them fails here instead of at build time.
const usedIcons = [
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "BarChart3",
  "Check",
  "ChevronLeft",
  "ChevronRight",
  "Clock",
  "Copy",
  "Download",
  "Eye",
  "EyeOff",
  "ExternalLink",
  "FileText",
  "Gauge",
  "GripVertical",
  "LayoutDashboard",
  "Link2",
  "Loader2",
  "LogOut",
  "Moon",
  "MousePointerClick",
  "PanelLeftClose",
  "PanelLeftOpen",
  "ScrollText",
  "Send",
  "ShieldCheck",
  "Sun",
  "Trash2",
  "User",
  "X",
  "ZoomIn",
  "ZoomOut",
] as const;

describe("lucide-react icon exports", () => {
  it("keeps every icon the app imports available", () => {
    const missing = usedIcons.filter((name) => icons[name] === undefined);
    expect(missing).toEqual([]);
  });

  it("exposes the renamed archive icon under its new name", () => {
    // v1.63.0 renamed archive-restore to archive-arrow-up.
    expect(icons.ArchiveArrowUp).toBeDefined();
  });
});
